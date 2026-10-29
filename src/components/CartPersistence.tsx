import {useEffect} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {useCart} from '@/store/cart';
import {useAuth} from '@/hooks/use-auth';
import {saveCustomerCart} from '@/lib/customer-program.functions';
export function CartPersistence(){const {user}=useAuth();const items=useCart(s=>s.items);const save=useServerFn(saveCustomerCart);useEffect(()=>{if(!user)return;const t=setTimeout(()=>{save({data:{items}}).catch(()=>{});},1000);return()=>clearTimeout(t);},[items,user?.id,save]);return null;}