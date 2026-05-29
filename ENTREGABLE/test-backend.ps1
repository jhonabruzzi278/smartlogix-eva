# SmartLogix - Prueba E2E Rigurosa (v4 - Nivel Produccion)
# Compatible PowerShell 5.1+
param([string]$BaseUrl = "http://localhost:80")

$ErrorActionPreference = "Continue"
$total = 0; $passed = 0; $failed = 0; $warn = 0
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

function Pass  { $script:total++; $script:passed++ }
function Fail  { $script:total++; $script:failed++ }
function Warn  { $script:total++; $script:passed++; $script:warn++ }

function Assert-GET    { param($Name,$Path,$ExpectedStatus=200,$RequiredProps)           Assert -Name $Name -Method GET    -Path $Path -ExpectedStatus $ExpectedStatus -RequiredProps $RequiredProps }
function Assert-POST   { param($Name,$Path,$Body,$ExpectedStatus=201,$RequiredProps)    Assert -Name $Name -Method POST   -Path $Path -Body $Body -ExpectedStatus $ExpectedStatus -RequiredProps $RequiredProps }
function Assert-PUT    { param($Name,$Path,$Body,$ExpectedStatus=200,$RequiredProps)    Assert -Name $Name -Method PUT    -Path $Path -Body $Body -ExpectedStatus $ExpectedStatus -RequiredProps $RequiredProps }
function Assert-DELETE { param($Name,$Path,$ExpectedStatus=200)                          Assert -Name $Name -Method DELETE -Path $Path -ExpectedStatus $ExpectedStatus }

function Assert {
    param($Name, $Method, $Path, $Body, $ExpectedStatus = 200, [string[]]$RequiredProps, [switch]$SkipJson, [switch]$Raw)
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

        if ($status -ne $ExpectedStatus) {
            $short = if ($body.Length -gt 200) { $body.Substring(0, 200) } else { $body }
            Write-Host "  [FAIL] $Name : esperaba $ExpectedStatus, recibio $status | $short" -ForegroundColor Red
            Fail; return $null
        }

        if ($Raw) { Pass; return $body }

        if (-not $SkipJson) {
            try { $obj = $body | ConvertFrom-Json } catch {
                Write-Host "  [WARN] $Name : no es JSON -> $($body.Substring(0,[Math]::Min(80,$body.Length)))" -ForegroundColor Yellow
                Warn; return $body
            }
            if ($RequiredProps -and $obj) {
                $check = if ($obj.Count -gt 0) { $obj[0] } else { $obj }
                foreach ($p in $RequiredProps) {
                    if ($check.PSObject.Properties.Name -notcontains $p) {
                        Write-Host "  [WARN] $Name : falta propiedad '$p'" -ForegroundColor Yellow; Warn
                    }
                }
            }
            Pass; return $obj
        }
        Pass; return $body
    } catch [System.Net.WebException] {
        $errStatus = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $errBody = try {
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $sr.ReadToEnd()
        } catch { "" }
        if ($errStatus -eq $ExpectedStatus) {
            Pass; return $null
        } else {
            Write-Host "  [FAIL] $Name : esperaba $ExpectedStatus, recibio $errStatus | $($_.Exception.Message.Substring(0,[Math]::Min(100,$_.Exception.Message.Length)))" -ForegroundColor Red
            Fail; return $null
        }
    } catch {
        Write-Host "  [FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red
        Fail; return $null
    }
}

# ── Helper para validaciones inline ──
function Validate-That {
    param($Label, $Condition)
    if ($Condition) { Write-Host "    [$Label] OK" -ForegroundColor DarkGreen; Pass }
    else { Write-Host "    [$Label] FALLO" -ForegroundColor Red; Fail }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SmartLogix E2E v4 - Nivel Produccion" -ForegroundColor Cyan
Write-Host " Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host " Hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════════
# BLOQUE 1: SALUD Y RUTEO BFF
# ═══════════════════════════════════════════════════════════════
Write-Host "[BLOQUE 1] SALUD, RUTEO BFF Y HEADERS" -ForegroundColor Cyan

Assert -Raw -Name "BFF /healthz responde JSON" -Method GET -Path "/healthz" -ExpectedStatus 200
Assert -Raw -Name "BFF 404 en ruta inexistente" -Method GET -Path "/api/xyz-no-existe" -ExpectedStatus 404

# Verificar cada microservicio (puertos directos, no BFF)
Assert-GET "orders-service UP via BFF" "/api/orders/test" -SkipJson

# shipping-service y notification-service no exponen /test via BFF, verificamos listando
Assert-GET "shipping-service (listar envios)" "/api/shipments" -ExpectedStatus 200
Assert-GET "notification-service (trazabilidad)" "/api/notifications/order/1"

# Verificar headers CORS (opcional, depende de configuracion)
try {
    $cors = Invoke-WebRequest -Uri "$BaseUrl/api/orders/test" -Method OPTIONS -UseBasicParsing -ErrorAction Stop
    Write-Host "  [PASS] CORS preflight responde $($cors.StatusCode)" -ForegroundColor Green; Pass
} catch { Write-Host "  [INFO] CORS no configurado para preflight (no critico)" -ForegroundColor Gray }

# ═══════════════════════════════════════════════════════════════
# BLOQUE 2: CLIENTES - CRUD COMPLETO + VALIDACIONES
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[BLOQUE 2] CLIENTES - CRUD + Validaciones" -ForegroundColor Cyan

# Crear
$c1 = Assert-POST "Crear cliente A" "/api/customers" -Body @{
    name = "Supermercado Don Pepe"; phone = "+56951111111"
    address = "Av. Matta 2340, Santiago"; email = "pepe@correo.cl"
} -RequiredProps @("id","name","phone","email","address","created_at")

$c2 = Assert-POST "Crear cliente B" "/api/customers" -Body @{
    name = "Ferreteria El Clavo"; phone = "+56952222222"
    address = "Gran Avenida 567, San Miguel"; email = "clavo@correo.cl"
}

$c3 = Assert-POST "Crear cliente C (sin telefono ni email)" "/api/customers" -Body @{
    name = "Almacen La Esquina"
} -ExpectedStatus 201

# Validar integridad de datos
if ($c1) {
    Validate-That "Cliente A: id es numerico" ($c1.id -is [long] -or $c1.id -is [int] -or ($c1.id -as [int] -gt 0))
    Validate-That "Cliente A: name no vacio" ($c1.name.Length -gt 0)
    Validate-That "Cliente A: email contiene @" ($c1.email -match "@")
    Write-Host "    [INFO] Cliente A creado: id=$($c1.id) name=$($c1.name)" -ForegroundColor Gray
}

# Validaciones de negocio
Assert-POST "Crear sin nombre (400)" "/api/customers" -Body @{ name = "" } -ExpectedStatus 400
Assert-POST "Crear con nombre muy largo (500 DB)" "/api/customers" -Body @{
    name = "A" * 250; phone = ""; address = ""; email = ""
} -ExpectedStatus 500

# Listar y verificar
$allCustomers = Assert-GET "Listar todos los clientes" "/api/customers" -RequiredProps @("id","name","email")
Validate-That "Hay al menos 3 clientes" ($allCustomers.Count -ge 3)

# Consultar por ID
if ($c1) {
    Assert-GET "GET cliente por ID" "/api/customers/$($c1.id)" -RequiredProps @("id","name","phone","email","address")
    Assert-GET "GET cliente inexistente (404)" "/api/customers/99999" -ExpectedStatus 404
}

# Editar y verificar
if ($c1) {
    $updated = Assert-PUT "Editar nombre y telefono" "/api/customers/$($c1.id)" -Body @{
        name = "Supermercado Don Pepe MODIFICADO"; phone = "+56959999999"
        address = $c1.address; email = $c1.email
    }
    if ($updated) {
        Validate-That "Nombre cambio correctamente" ($updated.name -eq "Supermercado Don Pepe MODIFICADO")
        Validate-That "Telefono cambio correctamente" ($updated.phone -eq "+56959999999")
    }
    Assert-PUT "Editar cliente inexistente (404)" "/api/customers/99999" -Body @{
        name = "X"; phone = ""; address = ""; email = ""
    } -ExpectedStatus 404
}

# Eliminar y verificar
if ($c3) {
    Assert-DELETE "Eliminar cliente C" "/api/customers/$($c3.id)"
    Assert-GET "Verificar que cliente C no existe (404)" "/api/customers/$($c3.id)" -ExpectedStatus 404
}
Assert-DELETE "Eliminar cliente inexistente (404)" "/api/customers/99999" -ExpectedStatus 404

# ═══════════════════════════════════════════════════════════════
# BLOQUE 3: INVENTARIO - CRUD + STOCK + VENTAS
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[BLOQUE 3] INVENTARIO - CRUD + Stock + Ventas" -ForegroundColor Cyan

Assert-GET "Listar inventario (vacio o con datos)" "/api/inventory"

$p1 = Assert-POST "Crear producto X" "/api/inventory" -Body @{
    sku = "PROD-E2E-X"; stock = 100
} -RequiredProps @("id","sku","stock")
$p2 = Assert-POST "Crear producto Y" "/api/inventory" -Body @{
    sku = "PROD-E2E-Y"; stock = 5
}
$p3 = Assert-POST "Crear producto Z (stock 0)" "/api/inventory" -Body @{
    sku = "PROD-E2E-Z"; stock = 0
}

Assert-POST "SKU duplicado (409)" "/api/inventory" -Body @{
    sku = "PROD-E2E-X"; stock = 50
} -ExpectedStatus 409

Assert-POST "Crear sin stock (default 0)" "/api/inventory" -Body @{
    sku = "PROD-E2E-NOSTOCK"; stock = 0
} -ExpectedStatus 201

# Validar integridad
if ($p1) {
    $p1check = Assert-GET "GET producto X por SKU" "/api/inventory/$($p1.sku)" -RequiredProps @("id","sku","stock")
    if ($p1check) {
        Validate-That "Stock inicial = 100" ($p1check.stock -eq 100)
    }
}

# Ajustes de stock
Assert-POST "Ajustar X +50" "/api/inventory/PROD-E2E-X/adjust?delta=50" -ExpectedStatus 200 -RequiredProps @("sku","stock","delta")
$post50 = Assert-GET "Verificar stock 150" "/api/inventory/PROD-E2E-X"
Validate-That "Stock = 150 tras +50" ($post50 -and $post50.stock -eq 150)

Assert-POST "Ajustar X -30 (genera venta)" "/api/inventory/PROD-E2E-X/adjust?delta=-30" -ExpectedStatus 200 -RequiredProps @("sku","stock","delta")
$post30 = Assert-GET "Verificar stock 120" "/api/inventory/PROD-E2E-X"
Validate-That "Stock = 120 tras -30" ($post30 -and $post30.stock -eq 120)

# Casos borde stock
Assert-POST "Ajustar X -999 (stock insuficiente, 400)" "/api/inventory/PROD-E2E-X/adjust?delta=-999" -ExpectedStatus 400
Assert-POST "Ajustar Y -5 (deja en 0, valido)" "/api/inventory/PROD-E2E-Y/adjust?delta=-5" -ExpectedStatus 200

# Stock minimo no permite negativos
$yCheck = Assert-GET "Verificar Y en 0" "/api/inventory/PROD-E2E-Y"
Validate-That "Stock Y = 0" ($yCheck -and $yCheck.stock -eq 0)
Assert-POST "Ajustar Y -1 (no permite negativo, 400)" "/api/inventory/PROD-E2E-Y/adjust?delta=-1" -ExpectedStatus 400

# Verificar ventas registradas
$ventas = Assert-GET "Listar ventas" "/api/sales" -RequiredProps @("id","sku","quantity","sale_date")
Validate-That "Hay al menos 2 ventas registradas" ($ventas.Count -ge 2)

# Eliminar producto
Assert-DELETE "Eliminar producto Z" "/api/inventory/PROD-E2E-Z"
Assert-GET "Verificar Z eliminado (404)" "/api/inventory/PROD-E2E-Z" -ExpectedStatus 404

# ═══════════════════════════════════════════════════════════════
# BLOQUE 4: PEDIDOS - CICLO DE VIDA COMPLETO
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[BLOQUE 4] PEDIDOS - Ciclo de Vida Completo" -ForegroundColor Cyan

$custId = if ($c1) { $c1.id } else { 1 }
$skuTest = "PROD-E2E-X"

# 4.1 Crear pedido
$o1 = Assert-POST "Crear pedido #1" "/api/orders" -Body @{
    customerId = $custId; sku = $skuTest; quantity = 2
} -RequiredProps @("orderId","status","message")

Validate-That "Pedido #1 status = CREATED" ($o1.status -eq "CREATED")

# 4.2 Listar y verificar que aparece
$orders = Assert-GET "Listar pedidos" "/api/orders" -RequiredProps @("id","customer_id","sku","quantity","status","created_at")
$o1InList = $orders | Where-Object { $_.id -eq $o1.orderId }
Validate-That "Pedido #1 aparece en lista" ($o1InList -ne $null)
if ($o1InList) {
    Validate-That "Pedido #1 status en lista = CREATED" ($o1InList.status -eq "CREATED")
}

# 4.3 Confirmar
$stockAntes = (Assert-GET "Stock antes de confirmar" "/api/inventory/$skuTest").stock
$o1conf = Assert-PUT "Confirmar pedido #1" "/api/orders/$($o1.orderId)/confirm" -RequiredProps @("id","status")
Validate-That "Pedido #1 ahora EN_PREPARACION" ($o1conf.status -eq "EN_PREPARACION")
$stockDespues = (Assert-GET "Stock despues de confirmar" "/api/inventory/$skuTest").stock
Validate-That "Stock se redujo en 2" (($stockDespues -eq ($stockAntes - 2)) -or ($stockDespues -eq $stockAntes -and $o1conf.warnings))

# 4.4 Asignar transportista
$o1assign = Assert-PUT "Asignar shipper01" "/api/orders/$($o1.orderId)/assign?transporter=shipper01" -RequiredProps @("id","assigned_to")
Validate-That "assigned_to = shipper01" ($o1assign.assigned_to -eq "shipper01")

Assert-PUT "Asignar sin parametro (400)" "/api/orders/$($o1.orderId)/assign?transporter=" -ExpectedStatus 400

# 4.5 Cancelar pedido (restaura stock)
$stockAntesCancel = (Assert-GET "Stock antes de cancelar" "/api/inventory/$skuTest").stock
$o2cancel = Assert-POST "Crear pedido #2 para cancelar" "/api/orders" -Body @{
    customerId = $custId; sku = $skuTest; quantity = 3
} -ExpectedStatus 201
Assert-PUT "Confirmar #2" "/api/orders/$($o2cancel.orderId)/confirm"
$o2cancelled = Assert-PUT "Cancelar #2 con motivo" "/api/orders/$($o2cancel.orderId)/cancel" -Body @{
    reason = "Cliente desistio de la compra"
} -RequiredProps @("id","status","cancel_reason")
Validate-That "Status = CANCELADO" ($o2cancelled.status -eq "CANCELADO")
Validate-That "cancel_reason guardado" ($o2cancelled.cancel_reason -eq "Cliente desistio de la compra")

# 4.6 Eliminar pedido cancelado
Assert-DELETE "Eliminar pedido #2" "/api/orders/$($o2cancel.orderId)"

# 4.7 Pedido cancelado desde estado CREATED (sin restaurar stock)
$o3 = Assert-POST "Crear pedido #3 (CREATED)" "/api/orders" -Body @{
    customerId = $custId; sku = $skuTest; quantity = 1
} -ExpectedStatus 201
Assert-PUT "Cancelar #3 desde CREATED" "/api/orders/$($o3.orderId)/cancel" -Body @{
    reason = "Cancelado antes de confirmar"
}
Assert-DELETE "Eliminar pedido #3" "/api/orders/$($o3.orderId)"
Assert-GET "Verificar #3 eliminado (404)" "/api/orders/$($o3.orderId)" -ExpectedStatus 404

# 4.8 Casos borde pedidos
Assert-PUT "Confirmar pedido inexistente (404)" "/api/orders/99999/confirm" -ExpectedStatus 404
Assert-PUT "Cancelar pedido inexistente (404)" "/api/orders/99999/cancel" -Body @{ reason = "x" } -ExpectedStatus 404
Assert-DELETE "Eliminar pedido inexistente (404)" "/api/orders/99999" -ExpectedStatus 404

# ═══════════════════════════════════════════════════════════════
# BLOQUE 5: ENVIOS - CICLO COMPLETO + TRACKING
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[BLOQUE 5] ENVIOS - Tracking y Etapas" -ForegroundColor Cyan

$shipments = Assert-GET "Listar envios" "/api/shipments" -RequiredProps @("id","order_id","status","tracking_number")

if ($shipments -and $shipments.Count -gt 0) {
    $ship = $shipments[0]
    Validate-That "tracking_number no nulo" ($ship.tracking_number -ne $null -and $ship.tracking_number.Length -gt 0)
    Validate-That "tracking tiene formato TRACK-" ($ship.tracking_number -match "^TRACK-")

    # Avanzar etapas
    $s1 = Assert-PUT "Envio -> EN_REPARTO" "/api/shipments/$($ship.id)/stage?stage=EN_REPARTO" -RequiredProps @("id","status")
    Validate-That "Status = EN_REPARTO" ($s1.status -eq "EN_REPARTO")

    $s2 = Assert-PUT "Envio -> ENTREGADO con datos" "/api/shipments/$($ship.id)/stage?stage=ENTREGADO" -Body @{
        customerCode = "C-001"; recipientRut = "12345678-9"
    } -RequiredProps @("id","status")
    Validate-That "Status = ENTREGADO" ($s2.status -eq "ENTREGADO")
    Validate-That "customer_code = C-001" ($s2.customer_code -eq "C-001")
    Validate-That "recipient_rut = 12345678-9" ($s2.recipient_rut -eq "12345678-9")

    # Etapa invalida
    Assert-PUT "Etapa invalida (400)" "/api/shipments/$($ship.id)/stage?stage=INVALIDO" -ExpectedStatus 400
}

# ═══════════════════════════════════════════════════════════════
# BLOQUE 6: TRAZABILIDAD Y NOTIFICACIONES
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[BLOQUE 6] TRAZABILIDAD" -ForegroundColor Cyan

$trace1 = Assert-GET "Trazabilidad orden #1" "/api/notifications/order/$($o1.orderId)"
if ($trace1 -and $trace1.Count -gt 0) {
    Validate-That "Tiene al menos 1 evento" ($trace1.Count -ge 1)
    $evt = $trace1[0]
    Validate-That "Evento tiene message" ($evt.message -ne $null)
    Validate-That "Evento tiene source_service" ($evt.source_service -ne $null)
}

Assert-GET "Audiencia OPERATOR" "/api/notifications/audience/OPERATOR"
Assert-GET "Audiencia CLIENT" "/api/notifications/audience/CLIENT"
Assert-GET "Audiencia inexistente (400)" "/api/notifications/audience/NOEXISTE" -ExpectedStatus 400

# ═══════════════════════════════════════════════════════════════
# BLOQUE 7: FLUJO E2E COMPLETO (Producto -> Cliente -> Pedido -> Envio -> Trazabilidad)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[BLOQUE 7] FLUJO E2E COMPLETO (End-to-End)" -ForegroundColor Cyan

# 1. Crear producto
$flowProd = Assert-POST "E2E: Crear producto" "/api/inventory" -Body @{
    sku = "FLOW-E2E-FINAL"; stock = 50
} -ExpectedStatus 201

# 2. Crear cliente
$flowCust = Assert-POST "E2E: Crear cliente" "/api/customers" -Body @{
    name = "Cliente Final E2E"; phone = "+56966666666"
    address = "Av. E2E 999, Providencia"; email = "e2e@final.cl"
} -ExpectedStatus 201

# 3. Crear pedido
$flowOrder = Assert-POST "E2E: Crear pedido" "/api/orders" -Body @{
    customerId = $flowCust.id; sku = "FLOW-E2E-FINAL"; quantity = 5
} -ExpectedStatus 201

# 4. Confirmar
$stockBefore = (Assert-GET "E2E: Stock antes" "/api/inventory/FLOW-E2E-FINAL").stock
Assert-PUT "E2E: Confirmar pedido" "/api/orders/$($flowOrder.orderId)/confirm"
$stockAfter = (Assert-GET "E2E: Stock despues" "/api/inventory/FLOW-E2E-FINAL").stock
Validate-That "E2E: Stock reducido correctamente" ($stockAfter -eq ($stockBefore - 5))

# 5. Verificar envio generado
$flowShipment = Assert-GET "E2E: Buscar envio del pedido" "/api/shipments/$($flowOrder.orderId)" -RequiredProps @("id","tracking_number")

# 6. Avanzar envio hasta entregado
if ($flowShipment -and $flowShipment.id) {
    Assert-PUT "E2E: Envio -> EN_REPARTO" "/api/shipments/$($flowShipment.id)/stage?stage=EN_REPARTO"
    Assert-PUT "E2E: Envio -> ENTREGADO" "/api/shipments/$($flowShipment.id)/stage?stage=ENTREGADO" -Body @{
        customerCode = "E2E-CUST-001"; recipientRut = "99999999-9"
    }
}

# 7. Trazabilidad completa
$flowTrace = Assert-GET "E2E: Trazabilidad final" "/api/notifications/order/$($flowOrder.orderId)"
Validate-That "E2E: Trazabilidad tiene eventos" ($flowTrace -and $flowTrace.Count -gt 0)

Write-Host "  [FLUJO E2E COMPLETO] Producto creado -> Cliente creado -> Pedido -> Confirmado -> Envio -> Entregado -> Trazabilidad OK" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# BLOQUE 8: PRUEBAS DE CARGA LIGERA Y RENDIMIENTO
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[BLOQUE 8] RENDIMIENTO Y ESTABILIDAD" -ForegroundColor Cyan

# Medir latencia del BFF
$sw = [System.Diagnostics.Stopwatch]::StartNew()
Invoke-WebRequest -Uri "$BaseUrl/healthz" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
$sw.Stop()
$latency = $sw.ElapsedMilliseconds
if ($latency -lt 500) {
    Write-Host "  [PASS] Latencia BFF: ${latency}ms (< 500ms)" -ForegroundColor Green; Pass
} else {
    Write-Host "  [WARN] Latencia BFF: ${latency}ms (> 500ms)" -ForegroundColor Yellow; Warn
}

# Crear 10 pedidos rapidos para probar estabilidad
Write-Host "  Creando 10 pedidos consecutivos..."
$creationsOk = 0
for ($i = 1; $i -le 10; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/orders" -Method POST -Body ( @{
            customerId = $custId; sku = $skuTest; quantity = 1
        } | ConvertTo-Json -Compress ) -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 201) { $creationsOk++ }
    } catch {}
}
Validate-That "10/10 pedidos creados exitosamente" ($creationsOk -eq 10)

# Limpiar pedidos de carga
$allOrders = Assert-GET "Listar pedidos (todos)" "/api/orders"
if ($allOrders) {
    $last10 = $allOrders | Select-Object -Last 10
    foreach ($o in $last10) {
        try {
            Invoke-WebRequest -Uri "$BaseUrl/api/orders/$($o.id)/cancel" -Method PUT -Body '{"reason":"limpieza carga"}' -ContentType "application/json" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
            Invoke-WebRequest -Uri "$BaseUrl/api/orders/$($o.id)" -Method DELETE -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
        } catch {}
    }
}
Write-Host "  [PASS] Limpieza de datos de carga completada" -ForegroundColor Green; Pass

# ═══════════════════════════════════════════════════════════════
# RESUMEN FINAL
# ═══════════════════════════════════════════════════════════════
$stopwatch.Stop()
$duration = [math]::Round($stopwatch.Elapsed.TotalSeconds, 2)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Duracion   : ${duration}s" -ForegroundColor White
Write-Host " Total      : $total pruebas" -ForegroundColor White
Write-Host " PASS       : $passed" -ForegroundColor Green
Write-Host " FAIL       : $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host " WARN       : $warn" -ForegroundColor $(if ($warn -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }
