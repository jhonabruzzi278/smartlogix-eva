package com.inventory_service.repository;

import com.inventory_service.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {
    List<Sale> findByCreatedAtAfter(LocalDateTime date);
    List<Sale> findByVendorId(String vendorId);
}
