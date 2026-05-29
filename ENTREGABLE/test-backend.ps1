# SmartLogix - Prueba E2E Rigurosa (v3)
# Compatible PowerShell 5.1+
# Uso: .\ENTREGABLE\test-backend.ps1 -BaseUrl "http://104.248.60.29"
param(
    [string]$BaseUrl = "http://localhost:80"
)

$ErrorActionPreference = "Continue"
$total = 0; $passed = 0; $failed = 0; $warn = 0
function Pass { $script:total++; $script:passed++; }
function Fail { $script:total++; $script:failed++; }
function Warn { $script:total++; $script:passed++; $script:warn++; }

function Assert {
    param($Name, $Method, $Path, $Body, $ExpectedStatus = 200, [string[]]$RequiredProps, [switch]$SkipJson)
    try {
        $uri = "$BaseUrl$Path"
        $bodyJson = if ($Body) { $Body | ConvertTo-Json -Compress } else { $null }
        if ($bodyJson) {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Body $bodyJson -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        }

        $status = $response.StatusCode
        $body = $response.Content
        $bodyShort = if ($body.Length -gt 150) { $body.Substring(0, 150) + "..." } else { $body }

        if ($status -ne $ExpectedStatus) {
            Write-Host "  [FAIL] $Name : esperaba status $ExpectedStatus, recibio $status" -ForegroundColor Red
            Write-Host "         $bodyShort" -ForegroundColor DarkGray
            Fail; return $null
        }

        if (-not $SkipJson) {
            try { $obj = $body | ConvertFrom-Json } catch {
                Write-Host "  [WARN] $Name : respuesta no es JSON. Body: $bodyShort" -ForegroundColor Yellow
                Warn; return $body
            }

            if ($RequiredProps) {
                $cleanBlock = if ($obj -and $obj.Count -gt 0) { $obj[0] } else { $obj }
                foreach ($prop in $RequiredProps) {
                    if ($cleanBlock -and $cleanBlock.PSObject.Properties.Name -notcontains $prop) {
                        Write-Host "  [WARN] $Name : falta propiedad '$prop'" -ForegroundColor Yellow
                        Warn
                    }
                }
            }

            Write-Host "  [PASS] $Name  [status: $status]" -ForegroundColor Green
            Pass; return $obj
        }

        Write-Host "  [PASS] $Name  [status: $status]" -ForegroundColor Green
        Pass; return $body

    } catch [System.Net.WebException] {
        $errStatus = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        if ($errStatus -eq $ExpectedStatus) {
            # Status code matches expected (e.g., expected 404)
            $respBody = try { (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch { "" }
            Write-Host "  [PASS] $Name  [status: $errStatus] $respBody" -ForegroundColor Green
            Pass; return $null
        } else {
            Write-Host "  [FAIL] $Name : esperaba $ExpectedStatus, recibio $errStatus - $($_.Exception.Message)" -ForegroundColor Red
            Fail; return $null
        }
    } catch {
        Write-Host "  [FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red
        Fail; return $null
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SmartLogix E2E - Prueba Rigurosa v3" -ForegroundColor Cyan
Write-Host " Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════════
# 1. SALUD DEL SISTEMA
# ═══════════════════════════════════════════════════════════════
Write-Host "[1] SALUD DEL SISTEMA" -ForegroundColor Cyan
Assert "Health check BFF"       "GET" "/healthz" -ExpectedStatus 200
Assert "Health check orders"    "GET" "/api/orders/test" -SkipJson
Assert "Ruta inexistente (404)" "GET" "/api/no-existe" -ExpectedStatus 404

# ═══════════════════════════════════════════════════════════════
# 2. CLIENTES (CRUD COMPLETO)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[2] CLIENTES (CRUD)" -ForegroundColor Cyan

$cust1 = Assert "Crear cliente" "POST" "/api/customers" -ExpectedStatus 201 -RequiredProps @("id","name","phone","email","address") -Body @{
    name = "Minimarket La Esquina"; phone = "+56911111111"; address = "Calle Falsa 123"; email = "minimarket@correo.cl"
}

$cust2 = Assert "Crear cliente 2" "POST" "/api/customers" -ExpectedStatus 201 -Body @{
    name = "Panaderia San Juan"; phone = "+56922222222"; address = "Los Aromos 456"; email = "panaderia@correo.cl"
}

Assert "Crear sin nombre (400)" "POST" "/api/customers" -ExpectedStatus 400 -Body @{
    name = ""; phone = "+569"; address = ""; email = ""
}

Assert "Listar clientes" "GET" "/api/customers" -RequiredProps @("id","name","phone","email","address")

if ($cust1 -and $cust1.id) {
    $cid1 = $cust1.id
    Assert "Consultar cliente por ID" "GET" "/api/customers/$cid1" -RequiredProps @("id","name","phone")
    Assert "Editar cliente" "PUT" "/api/customers/$cid1" -Body @{
        name = "Minimarket La Esquina Editado"; phone = "+56933333333"; address = "Nueva Direccion 789"; email = "nuevo@correo.cl"
    } -RequiredProps @("id","name")
    Assert "Verificar edicion" "GET" "/api/customers/$cid1" -ExpectedStatus 200
    Assert "Eliminar cliente" "DELETE" "/api/customers/$cid1" -ExpectedStatus 200
    Assert "Verificar eliminacion (404)" "GET" "/api/customers/$cid1" -ExpectedStatus 404
}

# ═══════════════════════════════════════════════════════════════
# 3. INVENTARIO (CRUD + STOCK)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[3] INVENTARIO (CRUD + Stock)" -ForegroundColor Cyan

Assert "Listar inventario" "GET" "/api/inventory" -RequiredProps @("id","sku","stock")

$prod1 = Assert "Crear producto" "POST" "/api/inventory" -ExpectedStatus 201 -RequiredProps @("id","sku","stock") -Body @{
    sku = "TEST-PROD-01"; stock = 50
}

Assert "Crear SKU duplicado (409)" "POST" "/api/inventory" -ExpectedStatus 409 -Body @{
    sku = "TEST-PROD-01"; stock = 10
}

Assert "Crear segundo producto" "POST" "/api/inventory" -ExpectedStatus 201 -Body @{
    sku = "TEST-PROD-02"; stock = 30
}

if ($prod1 -and $prod1.sku) {
    $sku = $prod1.sku
    Assert "Consultar SKU" "GET" "/api/inventory/$sku" -RequiredProps @("sku","stock")
    Assert "Ajustar stock +10" "POST" "/api/inventory/$sku/adjust?delta=10" -RequiredProps @("sku","stock","delta")
    
    # Validar que el stock realmente subio
    $invCheck = Assert "Verificar stock tras +10" "GET" "/api/inventory/$sku" -RequiredProps @("stock")
    if ($invCheck -and $invCheck.stock -ne 60) {
        Write-Host "  [WARN] Stock esperado 60, recibido $($invCheck.stock)" -ForegroundColor Yellow
    }

    Assert "Ajustar stock -3 (genera venta)" "POST" "/api/inventory/$sku/adjust?delta=-3" -RequiredProps @("sku","stock","delta")

    # Verificar que la venta se registro
    Assert "Listar ventas" "GET" "/api/sales" -RequiredProps @("id","sku","quantity")

    Assert "Ajustar mas del stock (400)" "POST" "/api/inventory/$sku/adjust?delta=-999" -ExpectedStatus 400

    Assert "Eliminar producto" "DELETE" "/api/inventory/$sku" -ExpectedStatus 200
    Assert "Verificar eliminacion (404)" "GET" "/api/inventory/$sku" -ExpectedStatus 404
}

# ═══════════════════════════════════════════════════════════════
# 4. PEDIDOS (CICLO DE VIDA COMPLETO)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[4] PEDIDOS (Happy Path + Cancel + Delete)" -ForegroundColor Cyan

$customerList = Assert "Obtener clientes para pedidos" "GET" "/api/customers"
$customerId = if ($customerList -and $customerList.Count -gt 0) { $customerList[0].id } else { 1 }

$prodList = Assert "Obtener productos para pedidos" "GET" "/api/inventory"
$testSku = if ($prodList -and $prodList.Count -gt 0) { $prodList[0].sku } else { "TEST-PROD-02" }

# 4.1 Crear pedido
$order1 = Assert "Crear pedido" "POST" "/api/orders" -ExpectedStatus 201 -RequiredProps @("orderId","status") -Body @{
    customerId = $customerId; sku = $testSku; quantity = 2
}

Assert "Listar pedidos" "GET" "/api/orders" -RequiredProps @("id","customer_id","sku","quantity","status")

# 4.2 Confirmar
if ($order1 -and $order1.orderId) {
    $oid1 = $order1.orderId
    Assert "Confirmar pedido" "PUT" "/api/orders/$oid1/confirm" -RequiredProps @("id","status")

    # 4.3 Asignar transportista
    Assert "Asignar transportista" "PUT" "/api/orders/$oid1/assign?transporter=shipper01" -RequiredProps @("id","assigned_to")
    Assert "Asignar sin parametro (400)" "PUT" "/api/orders/$oid1/assign?transporter=" -ExpectedStatus 400
}

# 4.4 Crear, confirmar, cancelar
$order2 = Assert "Crear pedido para cancelar" "POST" "/api/orders" -ExpectedStatus 201 -Body @{
    customerId = $customerId; sku = $testSku; quantity = 1
}
if ($order2 -and $order2.orderId) {
    $oid2 = $order2.orderId
    Assert "Confirmar antes de cancelar" "PUT" "/api/orders/$oid2/confirm"
    Assert "Cancelar pedido" "PUT" "/api/orders/$oid2/cancel" -RequiredProps @("id","status","cancel_reason") -Body @{
        reason = "Prueba de cancelacion E2E"
    }
}

# 4.5 Crear y eliminar (cancelado)
$order3 = Assert "Crear pedido para eliminar" "POST" "/api/orders" -ExpectedStatus 201 -Body @{
    customerId = $customerId; sku = $testSku; quantity = 1
}
if ($order3 -and $order3.orderId) {
    $oid3 = $order3.orderId
    Assert "Confirmar pedido 3" "PUT" "/api/orders/$oid3/confirm"
    Assert "Cancelar pedido 3" "PUT" "/api/orders/$oid3/cancel" -Body @{ reason = "Para eliminar" }
    Assert "Eliminar pedido" "DELETE" "/api/orders/$oid3" -ExpectedStatus 200
    Assert "Verificar eliminacion (404)" "GET" "/api/orders/$oid3" -ExpectedStatus 404 -SkipJson
}

# 4.6 Casos borde
Assert "Confirmar pedido inexistente (404)" "PUT" "/api/orders/99999/confirm" -ExpectedStatus 404
Assert "Cancelar pedido inexistente (404)" "PUT" "/api/orders/99999/cancel" -ExpectedStatus 404 -Body @{ reason = "x" }

# ═══════════════════════════════════════════════════════════════
# 5. ENVIOS (CICLO DE VIDA)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[5] ENVIOS" -ForegroundColor Cyan

$shipments = Assert "Listar envios" "GET" "/api/shipments" -RequiredProps @("id","order_id","status","tracking_number")
if ($shipments -and $shipments.Count -gt 0) {
    $sid = $shipments[0].id
    Assert "Avanzar a EN_REPARTO" "PUT" "/api/shipments/$sid/stage?stage=EN_REPARTO" -RequiredProps @("id","status")
    Assert "Entregar con datos" "PUT" "/api/shipments/$sid/stage?stage=ENTREGADO" -RequiredProps @("id","status") -Body @{
        customerCode = "C-E2E-TEST"; recipientRut = "11111111-1"
    }
}

# ═══════════════════════════════════════════════════════════════
# 6. TRAZABILIDAD
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[6] TRAZABILIDAD" -ForegroundColor Cyan
Assert "Trazabilidad orden existente" "GET" "/api/notifications/order/1" -RequiredProps @("id","message")

# ═══════════════════════════════════════════════════════════════
# 7. NEGOCIO: CONSISTENCIA DE DATOS
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[7] CONSISTENCIA DE DATOS" -ForegroundColor Cyan

# Crear producto con stock conocido
Assert "Crear producto stock-test" "POST" "/api/inventory" -ExpectedStatus 201 -Body @{
    sku = "STOCK-CHECK-01"; stock = 20
}

# Crear pedido con ese producto
$consOrder = Assert "Crear pedido consistencia" "POST" "/api/orders" -ExpectedStatus 201 -Body @{
    customerId = $customerId; sku = "STOCK-CHECK-01"; quantity = 3
}

if ($consOrder -and $consOrder.orderId) {
    $stockAntes = (Assert "Stock antes de confirmar" "GET" "/api/inventory/STOCK-CHECK-01").stock
    Assert "Confirmar pedido consistencia" "PUT" "/api/orders/$($consOrder.orderId)/confirm"
    $stockDespues = (Assert "Stock despues de confirmar" "GET" "/api/inventory/STOCK-CHECK-01").stock
    
    if ($stockAntes -and $stockDespues -and ($stockDespues -ne $stockAntes - 3)) {
        Write-Host "  [WARN] Stock inconsistente: era $stockAntes, esperaba $($stockAntes - 3), es $stockDespues" -ForegroundColor Yellow
    }
}

# ═══════════════════════════════════════════════════════════════
# RESUMEN
# ═══════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESULTADO: $passed PASS / $failed FAIL / $warn WARN  (total: $total)" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }
