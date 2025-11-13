import jsPDF from 'jspdf';
import { Order, Client } from '../types';

interface OrderItemWithDetails {
  itemId: string;
  quantity: number;
  price: number;
  name: string;
}

export const generateOrderPDF = async (
  order: Order, 
  client: Client, 
  orderItems: OrderItemWithDetails[]
) => {
  const doc = new jsPDF();
  
  // Company Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DODACÍ LIST', 20, 30);
  
  // Order Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Sesamo Food s.r.o.', 20, 50);
  doc.text('Purkynova 3091/97  61200 Brno',20, 60);
  doc.text('ICO:                       9075526', 20, 70);
  doc.text('DIC:                      CZ09075526', 20, 80);
  
  // Client Info
  doc.setFont('helvetica', 'bold');
  doc.text('Dodací list pro:', 120, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(client.name, 120, 60);
  
  // Split address into lines
  const addressLines = client.address.split(',').map(line => line.trim());
  let yPos = 70;
  addressLines.forEach(line => {
    doc.text(line, 120, yPos);
    yPos += 10;
  });
  
  doc.text(`ICO: ${client.vat}`, 120, yPos);
  //doc.text(`Phone: ${client.phone}`, 120, yPos + 10);
  //doc.text(`Email: ${client.email}`, 120, yPos + 20);

  doc.text(`Datum vystavení : ${new Date(order.deliveryDate).toLocaleDateString()}`, 20, yPos + 20);

  // Items Table Header
  doc.setFontSize(10);
  const tableStartY = Math.max(yPos + 20, 110);
  doc.setFont('helvetica', 'normal');
  doc.text('Popis položky', 20, tableStartY);
  doc.text('Množství', 85, tableStartY);
  doc.text('Cena za MJ', 105, tableStartY);
  doc.text('Celkem bez DPH', 125, tableStartY);
  doc.text('DPH', 155, tableStartY);
  doc.text('Celkem s DPH', 165, tableStartY);
  
  // Draw header line
  doc.line(20, tableStartY + 2, 190, tableStartY + 2);
  
  // Items
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  let currentY = tableStartY + 15;

  // calculate  order discount and total 
  let orderTotalDB = 0;
  let discount = 1;
  orderItems.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    orderTotalDB += itemTotal;
  });
  if (orderTotalDB < 600) {
    discount = 1;
  } else if (orderTotalDB < 1200) {
    discount = 0.9;
  } else {
    discount = 0.8;
  }
  // Total with discount and without VAT
  let orderTotal = orderTotalDB * discount * (1 - 0.12);
  orderItems.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    
    doc.text(item.name, 20, currentY);
    doc.text(item.quantity.toString(), 90, currentY);
    
    let priceDph    = item.price * discount * (1 - 0.12);
    let totalNoDph  = itemTotal * discount * (1 - 0.12);
    let totalDph    = itemTotal * discount;
    
    doc.text(`${priceDph.toFixed(2)}`, 110, currentY);
    doc.text(`${totalNoDph.toFixed(2)}`, 130, currentY);
    doc.text(`12%`, 155, currentY);
    doc.text(`${totalDph.toFixed(2)}`, 170, currentY);
    
    currentY += 8;
    
    // Add new page if needed
    if (currentY > 270) {
      doc.addPage();
      currentY = 30;
    }
  });
  
  // Total line
  doc.line(20, currentY + 5, 190, currentY + 5);
  doc.setFont('helvetica', 'bold');
  
  doc.text('Celkem bez DPH:', 90, currentY + 15);
  orderTotal = orderTotalDB * discount * 0.88;
  doc.text(`${orderTotal.toFixed(2)} CZK`, 170, currentY + 15);
  
  orderTotal = orderTotalDB * discount * 0.12;
  doc.text('Celkem DPH:', 90, currentY + 25);
  doc.text(`${orderTotal.toFixed(2)} CZK`, 170, currentY + 25);
  
  orderTotal = orderTotalDB * discount;
  doc.text('Celkem s DPH:', 90, currentY + 35);
  doc.text(`${orderTotal.toFixed(2)} CZK`, 170, currentY + 35);
  
  // Notes
  if (order.notes) {
    currentY += 30;
    doc.setFont('helvetica', 'bold');
    //doc.text('NOTES:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    
    // Split notes into lines to fit
    const notes = doc.splitTextToSize(order.notes, 170);
    // doc.text(notes, 20, currentY + 10);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('https://sesamobrno.cz/', 20, pageHeight - 20);
  //doc.text(`Generated on ${new Date().toLocaleDateString()}`, 120, pageHeight - 20);
  doc.text('Sesamo Obchodní <sesamosales@gmail.com>', 120, pageHeight - 20);
  
  // Save the PDF
  doc.save(`Dodaci_list-${new Date(order.deliveryDate).toLocaleDateString()}-${order.id.slice(-8)}-${client.name.replace(/\s+/g, '_')}.pdf`);
};