package com.inventory_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sales")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Sale {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String items;

    @Column(nullable = false)
    private Integer total;

    @Column(nullable = false)
    private String paymentMethod;

    @Column(nullable = false)
    private String vendorId;

    @Column(nullable = false)
    private String vendorName;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
