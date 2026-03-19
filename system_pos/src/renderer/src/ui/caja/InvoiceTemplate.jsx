/**
 * Plantilla de factura según normas DIAN (Dirección de Impuestos y Aduanas Nacionales)
 * Requiere información estructurada para validación fiscal
 * También soporta factura POS simplificada (no DIAN)
 */
export default function InvoiceTemplate({ saleData, invoiceType = 'Factura POS' }) {
  const isPOS = invoiceType === 'Factura POS'
  
  // Datos de la empresa (de Ocaña, Norte de Santander)
  const company = {
    name: 'TRENDO',
    nit: '999999999-9',
    address: 'Barrio San Agustín',
    city: 'Ocaña',
    department: 'Norte de Santander',
    phone: '+57 1 2345678',
    email: 'Trendo@gmail.com'
  }

  // Datos del cliente
  const customer = {
    document: saleData?.customer_document || 'S/I',
    name: saleData?.customer_name || '',
    email: saleData?.customer_email || '',
    phone: saleData?.customer_phone || '',
    address: saleData?.customer_address || '',
    city: saleData?.customer_city || ''
  }

  // Vendedor
  const seller = 'TRENDO SAS'

  // Datos de la venta
  const invoice = {
    number: saleData?.consecutive || 'POS-000001',
    date: saleData?.created_at ? new Date(saleData.created_at).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO'),
    time: saleData?.created_at ? new Date(saleData.created_at).toLocaleTimeString('es-CO') : new Date().toLocaleTimeString('es-CO'),
    method: saleData?.payment_method || 'Mixto',
    items: saleData?.items || [],
    subtotal: saleData?.subtotal || 0,
    discount: saleData?.discount || 0,
    credit: saleData?.credit || 0,
    base: saleData?.base || 0,
    iva: saleData?.iva || 0,
    total: saleData?.total || 0,
    employee: saleData?.employee_document || 'S/I'
  }

  const itemsTotal = invoice.items?.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const quantity = Number(item.quantity) || 0
    return sum + (price * quantity)
  }, 0) || Number(invoice.subtotal) || 0
  
  const baseAmount = Number(itemsTotal) / 1.19
  const ivaAmount = Number(itemsTotal) - baseAmount
  const totalFinal = Number(invoice.total) || itemsTotal

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <style>{`
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
            color: #333;
            line-height: 1.5;
          }
          .invoice-container {
            max-width: 900px;
            margin: 0 auto;
            border: 1px solid #999;
            padding: 30px;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .company-name {
            font-size: 26px;
            font-weight: bold;
            margin: 0;
            color: #000;
          }
          .company-info {
            font-size: 10px;
            margin: 3px 0;
            line-height: 1.3;
            color: #555;
          }
          .invoice-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
            color: #000;
          }
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin: 12px 0;
            font-size: 11px;
          }
          .invoice-meta-item {
            flex: 1;
          }
          .invoice-meta-label {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .section-title {
            font-weight: bold;
            font-size: 11px;
            background: #f5f5f5;
            padding: 6px 8px;
            margin-top: 12px;
            margin-bottom: 8px;
            border: 1px solid #ddd;
            border-radius: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .customer-info {
            font-size: 10px;
            line-height: 1.5;
            margin-bottom: 12px;
          }
          .customer-info-item {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .customer-label {
            font-weight: bold;
            min-width: 100px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 10px;
          }
          th {
            border: 1px solid #333;
            padding: 6px;
            text-align: left;
            font-weight: bold;
            background: #f9f9f9;
            font-size: 9px;
            text-transform: uppercase;
          }
          td {
            border: 1px solid #ddd;
            padding: 6px;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals {
            margin: 15px 0;
            font-size: 11px;
          }
          .totals-row {
            display: flex;
            justify-content: flex-end;
            margin: 4px 0;
          }
          .totals-label {
            font-weight: bold;
            min-width: 180px;
            text-align: right;
            margin-right: 30px;
          }
          .totals-value {
            min-width: 90px;
            text-align: right;
            font-weight: bold;
          }
          .total-final {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 8px 0;
            margin: 8px 0;
            font-size: 13px;
            font-weight: bold;
          }
          .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 9px;
            text-align: center;
            color: #666;
            line-height: 1.4;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 30px;
            font-size: 9px;
          }
          .signature-box {
            text-align: center;
            width: 30%;
          }
          .signature-line {
            border-top: 1px solid #000;
            height: 30px;
            margin-bottom: 5px;
          }
          .alert-box {
            border: 1px solid #e74c3c;
            padding: 8px;
            margin: 10px 0;
            font-size: 9px;
            background: #fdeef0;
            line-height: 1.3;
          }
          .payment-method {
            font-size: 10px;
            margin: 10px 0;
            padding: 8px;
            background: #f0f8ff;
            border-left: 3px solid #3498db;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .invoice-container {
              border: none;
              max-width: 100%;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="invoice-container">
          {/* Header */}
          <div className="header">
            <p className="company-name">{company.name}</p>
            <p className="company-info">NIT: {company.nit}</p>
            <p className="company-info">{company.address}</p>
            <p className="company-info">{company.city}, {company.department}</p>
            <p className="company-info">Teléfono: {company.phone} | Email: {company.email}</p>
            <p className="invoice-title">{isPOS ? 'FACTURA DE VENTA - POS' : 'FACTURA DE VENTA'}</p>
          </div>

          {/* Invoice Meta */}
          <div className="invoice-meta">
            <div className="invoice-meta-item">
              <div className="invoice-meta-label">Número de Factura:</div>
              <div>{invoice.number}</div>
            </div>
            <div className="invoice-meta-item">
              <div className="invoice-meta-label">Fecha:</div>
              <div>{invoice.date}</div>
            </div>
            <div className="invoice-meta-item">
              <div className="invoice-meta-label">Hora:</div>
              <div>{invoice.time}</div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="section-title">INFORMACIÓN DEL CLIENTE</div>
          <div className="customer-info">
            <div className="customer-info-item">
              <span className="customer-label">Documento:</span>
              <span>{customer.document}</span>
            </div>
            <div className="customer-info-item">
              <span className="customer-label">Nombre:</span>
              <span>{customer.name && customer.name.trim() ? customer.name : 'Consumidor Final'}</span>
            </div>
            {customer.address && (
              <div className="customer-info-item">
                <span className="customer-label">Dirección:</span>
                <span>{customer.address}</span>
              </div>
            )}
            {customer.city && (
              <div className="customer-info-item">
                <span className="customer-label">Ciudad:</span>
                <span>{customer.city}</span>
              </div>
            )}
            {customer.phone && (
              <div className="customer-info-item">
                <span className="customer-label">Teléfono:</span>
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="customer-info-item">
                <span className="customer-label">Email:</span>
                <span>{customer.email}</span>
              </div>
            )}
          </div>

          {/* Seller Info */}
          <div className="section-title">VENDEDOR</div>
          <div className="customer-info">
            <div className="customer-info-item">
              <span className="customer-label">Empresa:</span>
              <span>{seller}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="section-title">DETALLE DE PRODUCTOS/SERVICIOS</div>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th className="text-center">Cantidad</th>
                <th className="text-right">Valor Unitario</th>
                <th className="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => {
                  const price = Number(item.price) || 0
                  const quantity = Number(item.qty) || Number(item.quantity) || 0
                  const subtotal = price * quantity
                  return (
                    <tr key={idx}>
                      <td>{item.product_name || item.name || 'Producto'} {item.size ? `(Talla: ${item.size})` : ''}</td>
                      <td className="text-center">{quantity}</td>
                      <td className="text-right">$ {price.toLocaleString('es-CO')}</td>
                      <td className="text-right">$ {subtotal.toLocaleString('es-CO')}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">Sin detalle de productos disponible</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="section-title">RESUMEN FISCAL</div>
          <div className="totals">
            <div className="totals-row">
              <span className="totals-label">Subtotal (Antes de descuentos):</span>
              <span className="totals-value">$ {Number(itemsTotal).toLocaleString('es-CO')}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="totals-row">
                <span className="totals-label">Descuento:</span>
                <span className="totals-value">-$ {Number(invoice.discount).toLocaleString('es-CO')}</span>
              </div>
            )}
            {invoice.credit > 0 && (
              <div className="totals-row">
                <span className="totals-label">Valor a Favor (Devolución):</span>
                <span className="totals-value">-$ {Number(invoice.credit).toLocaleString('es-CO')}</span>
              </div>
            )}
            {!isPOS && (
              <>
                <div className="totals-row">
                  <span className="totals-label">Base Imponible (IVA 19%):</span>
                  <span className="totals-value">$ {Number(baseAmount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="totals-row">
                  <span className="totals-label">IVA (19%):</span>
                  <span className="totals-value">$ {Number(ivaAmount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                </div>
              </>
            )}
            <div className="totals-row total-final">
              <span className="totals-label">TOTAL A PAGAR:</span>
              <span className="totals-value">$ {Number(totalFinal).toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="payment-method">
            <strong>Método de Pago:</strong> {invoice.method}
          </div>

          {/* DIAN Notice */}
          <div className="alert-box">
            <strong>NOTA IMPORTANTE:</strong> Esta factura cumple con los requisitos establecidos por la Dirección de Impuestos y Aduanas Nacionales (DIAN) de Colombia. 
            Conserve esta factura para efectos fiscales y legales.
          </div>

          {/* Footer */}
          <div className="footer">
            <p><strong>Documento generado automáticamente</strong></p>
            {!isPOS ? (
              <>
                <p>Factura válida para efectos fiscales - Emitida bajo las normas DIAN</p>
                <p>Responsabilidad por diferencias: {company.name}</p>
              </>
            ) : (
              <p>Gracias por su compra en {company.name}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
