package com.smartlogix.orders_service.service;

import com.smartlogix.orders_service.dto.OrderResponse;
import com.smartlogix.contracts.events.OrderEvent;
import com.smartlogix.orders_service.model.Order;
import com.smartlogix.orders_service.model.OrderStatus;
import com.smartlogix.orders_service.publisher.OrderPublisher;
import com.smartlogix.orders_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderPublisher orderPublisher;

    @Transactional
    public OrderResponse createOrder(Order orderRequest) {
        log.info("Iniciando creacion de orden para cliente: {}", orderRequest.getCustomerId());

        orderRequest.setStatus(OrderStatus.CREATED);
        orderRequest.setCreatedAt(LocalDateTime.now());

        Order savedOrder = orderRepository.save(orderRequest);
        log.info("Orden guardada en DB con ID: {}", savedOrder.getId());

        OrderEvent event = OrderEvent.builder()
                .orderId(savedOrder.getId())
                .customerId(savedOrder.getCustomerId())
                .sku(savedOrder.getSku())
                .quantity(savedOrder.getQuantity())
                .status(savedOrder.getStatus().name())
                .build();

        orderPublisher.publishOrderCreated(event);

        return OrderResponse.builder()
                .orderId(savedOrder.getId())
                .status(savedOrder.getStatus().name())
                .message("Orden procesada y enviada a SQS correctamente")
                .createdAt(savedOrder.getCreatedAt())
                .build();
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
