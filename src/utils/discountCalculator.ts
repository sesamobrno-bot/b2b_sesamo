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
    message = `Buy for ${remaining.toFixed(0)} Kč more and get free delivery`;
  } else if (subtotal < 1200) {
   
    const remaining = 600 - subtotal;
    message = `Buy for ${remaining.toFixed(0)} Kč more and get 10% discount`;
  } else if (subtotal < 1200) {
    discountPercentage = 10;
    discount = subtotal * 0.1;
    const remaining = 1200 - subtotal;
    message = `Buy for ${remaining.toFixed(0)} Kč more and get 20% discount`;
  } else {
    discountPercentage = 20;
    discount = subtotal * 0.2;
    message = `20% discount applied`;
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
