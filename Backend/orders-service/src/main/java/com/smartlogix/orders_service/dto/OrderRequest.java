package com.smartlogix.orders_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderRequest {

    @NotNull(message = "El ID del cliente no puede ser nulo")
    private Long customerId;

    @NotNull(message = "El SKU del producto es obligatorio")
    private String sku;

    @NotNull(message = "La cantidad es obligatoria")
    @Min(value = 1, message = "La cantidad minima debe ser 1")
    private Integer quantity;
}
