interface DiscountInfo {
  subtotal: number;
  discount: number;
  discountPercentage: number;
  finalTotal: number;
  message: string;
}

export function calculateDiscount(subtotal: number): DiscountInfo {
  let discount = 0;
  let discountPercentage = 0;
  let message = '';

  if (subtotal < 1000) {
    const remaining = 1000 - subtotal;
    message = `Ještě ${remaining.toFixed(0)} Kč a máte dopravu zdarma.`;
  } else if (subtotal < 1500) {
   
    const remaining = 1500 - subtotal;
    message = `Ještě ${remaining.toFixed(0)} Kč a získáte slevu 5 %.`;
  } else if (subtotal < 1900) {
    discountPercentage = 5;
    discount = subtotal * 0.05;
    const remaining = 1900 - subtotal;
    message = `Buy for ${remaining.toFixed(0)} Kč more and get 10% discount`;
  } else {
    discountPercentage = 10;
    discount = subtotal * 0.1;
    message = `10% discount applied`;
  }

  const finalTotal = subtotal - discount;

  return {
    subtotal,
    discount,
    discountPercentage,
    finalTotal,
    message
  };
}
