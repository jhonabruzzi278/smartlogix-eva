package com.inventory_service.repository;

import com.inventory_service.model.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    Optional<Inventory> findBySku(String sku);
    List<Inventory> findByCategory(String category);
    boolean existsBySku(String sku);
    void deleteBySku(String sku);
}
