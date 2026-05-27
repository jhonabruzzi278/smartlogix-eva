package com.smartlogix.orders_service.service;

import com.smartlogix.orders_service.dto.OrderResponse;
import com.smartlogix.orders_service.model.Order;
import com.smartlogix.orders_service.model.OrderStatus;
import com.smartlogix.orders_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate;

    @Transactional
    public OrderResponse createOrder(Order orderRequest) {
        log.info("Iniciando creacion de orden para cliente: {}", orderRequest.getCustomerId());

        orderRequest.setStatus(OrderStatus.CREATED);
        orderRequest.setCreatedAt(LocalDateTime.now());

        Order savedOrder = orderRepository.save(orderRequest);
        log.info("Orden guardada en DB con ID: {}", savedOrder.getId());

        return OrderResponse.builder()
                .orderId(savedOrder.getId())
                .status(savedOrder.getStatus().name())
                .message("Orden creada correctamente")
                .createdAt(savedOrder.getCreatedAt())
                .build();
    }

    @Transactional
    public void confirmOrder(Long orderId) {
        log.info("Confirmando orden {}", orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Orden no encontrada: " + orderId));

        order.setStatus(OrderStatus.EN_PREPARACION);
        orderRepository.save(order);

        try {
            restTemplate.postForEntity(
                    "http://inventory-service:8082/api/inventory/" + order.getSku() + "/adjust?delta=-" + order.getQuantity(),
                    null, Void.class
            );

            Map<String, Object> shipmentRequest = Map.of(
                    "orderId", order.getId(),
                    "customerId", order.getCustomerId(),
                    "sku", order.getSku(),
                    "quantity", order.getQuantity()
            );
            restTemplate.postForEntity(
                    "http://shipping-service:8084/api/shipments",
                    shipmentRequest,
                    Void.class
            );
        } catch (Exception e) {
            log.error("Error al procesar confirmacion de orden {}: {}", orderId, e.getMessage());
        }
    }

    @Transactional
    public void cancelOrder(Long orderId, String reason) {
        log.info("Cancelando orden {}: {}", orderId, reason);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Orden no encontrada: " + orderId));

        OrderStatus prevStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELADO);
        order.setCancelReason(reason);
        orderRepository.save(order);

        if (prevStatus == OrderStatus.EN_PREPARACION) {
            try {
                restTemplate.postForEntity(
                        "http://inventory-service:8082/api/inventory/" + order.getSku() + "/adjust?delta=+" + order.getQuantity(),
                        null, Void.class
                );
            } catch (Exception e) {
                log.error("Error al restaurar stock para orden cancelada {}: {}", orderId, e.getMessage());
            }
        }
    }

    @Transactional
    public void updateOrderStatus(Long orderId, String status) {
        log.info("Actualizando estado de la orden {} a {}", orderId, status);
        orderRepository.findById(orderId).ifPresent(order -> {
            order.setStatus(OrderStatus.valueOf(status));
            orderRepository.save(order);
        });
    }

    @Transactional
    public void assignOrder(Long orderId, String transporter) {
        log.info("Asignando transportista {} a la orden {}", transporter, orderId);
        orderRepository.findById(orderId).ifPresent(order -> {
            order.setAssignedTo(transporter);
            orderRepository.save(order);
        });
    }

    public List<Order> getAllOrders() {
        log.info("Recuperando todas las ordenes de la base de datos");
        return orderRepository.findAll();
    }

    public Optional<Order> getOrderById(Long id) {
        return orderRepository.findById(id);
    }
}
