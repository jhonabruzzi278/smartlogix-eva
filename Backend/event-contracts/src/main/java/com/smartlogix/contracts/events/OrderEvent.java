package com.smartlogix.contracts.events;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderEvent {

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
    @NotBlank(message = "status no puede estar vacio")
    @Pattern(regexp = "^(CREATED|CONFIRMED|REJECTED)$", message = "status debe ser CREATED, CONFIRMED o REJECTED")
    private String status = "CREATED";

    @Builder.Default
    private String version = "1";
}
