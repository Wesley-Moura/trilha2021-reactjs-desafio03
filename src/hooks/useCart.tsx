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

type ProductRequest = Omit<Product, 'amount'>

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let updateLocalStorage = [...cart];
      const response = await api.get(`/stock/${productId}`);
      const productStock: Stock = response.data;

      const productExists = cart.find((item) => item.id === productId);
      const productExistsAmount = Number(productExists?.amount) | 0;


      if (productStock.amount > productExistsAmount) {
        if (productExists) {
          const productsUpdated = cart.map((item) => {
            if (item.id === productId) {
              return {
                id: item.id,
                title: item.title,
                price: item.price,
                image: item.image,
                amount: item.amount += 1,
              }
            } else {
              return item
            }
          })

          setCart(productsUpdated)
          updateLocalStorage = productsUpdated
        } else {
          const response = await api.get(`/products/${productId}`);
          const product: ProductRequest = response.data;

          const newProduct = {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            amount: 1,
          }

          setCart([...cart, newProduct])
          updateLocalStorage = [...cart, newProduct];
        }

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateLocalStorage));
      } else {
        throw new Error('Quantidade solicitada fora de estoque')
      }
    } catch (error: any) {
      let message = 'Erro na adição do produto';

      if (error?.message === 'Quantidade solicitada fora de estoque') {
        message = error.message;
      }

      toast.error(message)
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productsUpdated = cart.filter((item) => item.id !== productId);

      if (cart.length === productsUpdated.length) {
        throw new Error()
      }

      setCart(productsUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsUpdated))
    } catch {
      let message = 'Erro na remoção do produto';
      toast.error(message)
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount > 0) {
        const response = await api.get(`/stock/${productId}`);
        const productStock: Stock = response.data;

        if (productStock.amount >= amount) {
          const productsUpdated = cart.map((item) => {
            if (item.id === productId) {
              return {
                id: item.id,
                title: item.title,
                price: item.price,
                image: item.image,
                amount: amount,
              }
            } else {
              return item
            }
          })

          setCart(productsUpdated)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsUpdated))
        } else {
          throw new Error('Quantidade solicitada fora de estoque')
        }
      }
    } catch (error: any) {
      let message = 'Erro na alteração de quantidade do produto';

      if (error?.message === 'Quantidade solicitada fora de estoque') {
        message = error.message;
      }

      toast.error(message)
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
