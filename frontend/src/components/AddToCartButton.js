"use client";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function AddToCartButton({
  productId,
  quantity = 1,
  productData = null,
  className = "",
  children = "Sepete Ekle",
  disabled = false,
  ...buttonProps
}) {
  const { addItem } = useCart();
  const { show } = useToast();

  const handleClick = () => {
    if (disabled) return;
    const normalizedQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    addItem(productId, normalizedQty, productData);
    show(`${normalizedQty} adet sepete eklendi`, "success");
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600 ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
