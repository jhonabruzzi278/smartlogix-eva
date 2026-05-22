package com.inventory_service.service;

import com.inventory_service.model.Sale;
import com.inventory_service.repository.SaleRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final InventoryService inventoryService;

    public List<Sale> getAllSales() {
        return saleRepository.findAll();
    }

    public List<Sale> getSalesSince(LocalDateTime date) {
        return saleRepository.findByCreatedAtAfter(date);
    }

    @Transactional
    public Sale createSale(Sale sale) {
        Sale saved = saleRepository.save(sale);
        log.info("Venta registrada: id={}, total={}, vendor={}", saved.getId(), saved.getTotal(), saved.getVendorName());
        return saved;
    }
}
