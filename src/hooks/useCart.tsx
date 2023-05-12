import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const KEY_LOCAL_STORAGE = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem(KEY_LOCAL_STORAGE);

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const found = cart.find((f) => f.id === productId);
      const sum = found ? found.amount + 1 : 1;

      const { data } = await api.get(`stock/${productId}`);
      const stockAmount: Stock = data;

      if (stockAmount.amount < sum)
        toast.error('Quantidade solicitada fora de estoque');
      else {
        const { data } = await api.get(`products/${productId}`);
        const item: Product = data;

        if (item) {
          const others = cart.filter((f) => f.id !== productId);
          const value = [...others, { ...item, amount: sum }];
          localStorage.setItem(KEY_LOCAL_STORAGE, JSON.stringify(value));
          setCart(value);
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const found = cart.find((f) => f.id === productId);
      if (!found) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const items = cart.filter((f) => f.id !== productId);

      localStorage.setItem(KEY_LOCAL_STORAGE, JSON.stringify(items));
      setCart(items);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data } = await api.get(`stock/${productId}`);
      const stockAmount: Stock = data;

      if (stockAmount.amount < amount)
        toast.error('Quantidade solicitada fora de estoque');
      else {
        const items = cart.map((f) => {
          if (f.id === productId) {
            return { ...f, amount };
          }
          return f;
        });

        localStorage.setItem(KEY_LOCAL_STORAGE, JSON.stringify(items));
        setCart(items);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
