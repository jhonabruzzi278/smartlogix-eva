package com.smartlogix.shipping_service.service;

import com.smartlogix.contracts.events.NotificationEvent;
import com.smartlogix.shipping_service.model.Shipment;
import com.smartlogix.shipping_service.model.ShipmentStatus;
import com.smartlogix.shipping_service.publisher.NotificationPublisher;
import com.smartlogix.shipping_service.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShippingService {

    private final ShipmentRepository shipmentRepository;
    private final NotificationPublisher notificationPublisher;

    @Transactional
    public Shipment createShipment(Long orderId, Long customerId, String sku, Integer quantity) {
        log.info("[SHIPPING] Creando envio para Orden ID: {}, Cliente: {}, SKU: {}, Cantidad: {}",
                orderId, customerId, sku, quantity);

        Shipment shipment = Shipment.builder()
                .orderId(orderId)
                .customerId(customerId)
                .sku(sku)
                .quantity(quantity)
                .status(ShipmentStatus.LABEL_CREATED)
                .trackingNumber(generateTrackingNumber())
                .createdAt(LocalDateTime.now())
                .build();

        Shipment savedShipment = shipmentRepository.save(shipment);
        log.info("[SHIPPING] Envio creado con ID: {}, Tracking: {}", savedShipment.getId(), savedShipment.getTrackingNumber());

        notificationPublisher.publish(NotificationEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orderId(savedShipment.getOrderId())
                .customerId(savedShipment.getCustomerId())
                .stage("SHIPMENT_CREATED")
                .status(savedShipment.getStatus().name())
                .message("Envio creado con tracking " + savedShipment.getTrackingNumber())
                .sourceService("shipping-service")
                .audience("BOTH")
                .occurredAt(LocalDateTime.now())
                .build());

        return savedShipment;
    }

    @Transactional
    public Shipment shipOrder(Long orderId) {
        log.info("[SHIPPING] Procesando envio para Orden ID: {}", orderId);

        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Envio no encontrado para Orden ID: " + orderId));

        shipment.setStatus(ShipmentStatus.DELIVERED);
        shipment.setShippedAt(LocalDateTime.now());
        Shipment updated = shipmentRepository.save(shipment);

        log.info("[SHIPPING] Orden {} enviada con tracking {}", orderId, updated.getTrackingNumber());
        return updated;
    }

    private String generateTrackingNumber() {
        return "TRACK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
