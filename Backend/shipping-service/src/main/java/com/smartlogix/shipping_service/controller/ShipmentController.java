package com.smartlogix.shipping_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.smartlogix.shipping_service.model.Shipment;
import com.smartlogix.shipping_service.model.ShipmentStatus;
import com.smartlogix.shipping_service.repository.ShipmentRepository;
import com.smartlogix.shipping_service.service.ShippingService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shipments")
public class ShipmentController {

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private ShippingService shippingService;

    @GetMapping
    public ResponseEntity<List<Shipment>> getAllShipments() {
        return ResponseEntity.ok(shipmentRepository.findAll());
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Shipment> getShipmentByOrderId(@PathVariable Long orderId) {
        return shipmentRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Shipment createShipment(@RequestBody Map<String, Object> request) {
        Long orderId = Long.valueOf(request.get("orderId").toString());
        Long customerId = request.get("customerId") != null ? Long.valueOf(request.get("customerId").toString()) : 0L;
        String sku = request.get("sku").toString();
        Integer quantity = Integer.valueOf(request.get("quantity").toString());

        if (shipmentRepository.findByOrderId(orderId).isPresent()) {
            throw new RuntimeException("Ya existe un envio para la orden " + orderId);
        }

        return shippingService.createShipment(orderId, customerId, sku, quantity);
    }

    @PutMapping("/{id}/stage")
    public ResponseEntity<Shipment> updateStage(@PathVariable Long id, @RequestParam String stage,
                                                 @RequestBody(required = false) Map<String, String> proof) {
        Shipment shipment = shipmentRepository.findById(id).orElse(null);
        if (shipment == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            shipment.setStatus(ShipmentStatus.valueOf(stage.toUpperCase()));
            if (stage.equalsIgnoreCase("out_for_delivery") || stage.equalsIgnoreCase("in_transit")) {
                shipment.setShippedAt(LocalDateTime.now());
            }
            if (stage.equalsIgnoreCase("delivered") && proof != null) {
                String image = proof.get("proofOfDeliveryImage");
                String rut = proof.get("recipientRut");
                if (image != null && !image.isBlank()) {
                    shipment.setProofOfDeliveryImage(image);
                }
                if (rut != null && !rut.isBlank()) {
                    shipment.setRecipientRut(rut);
                }
            }
            shipmentRepository.save(shipment);
            return ResponseEntity.ok(shipment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
