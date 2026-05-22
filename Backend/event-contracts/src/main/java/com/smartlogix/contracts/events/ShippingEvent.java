package com.smartlogix.contracts.events;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingEvent {

    @NotNull(message = "orderId es requerido")
    private Long orderId;

    @NotNull(message = "customerId es requerido")
    private Long customerId;

    @NotNull(message = "sku es requerido")
    private String sku;

    @NotNull(message = "quantity es requerido")
    @Min(value = 1, message = "quantity debe ser >= 1")
    @Max(value = 10000, message = "quantity debe ser <= 10000")
    private Integer quantity;

    @Builder.Default
    private String version = "1";
}
