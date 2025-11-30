import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Item, Order, OrderItem } from '../types';

export function useSupabaseData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (clientsError) throw clientsError;

      // Load items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true });    
      
      if (itemsError) throw itemsError;

      // Load orders with order items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            item_id,
            quantity,
            price
          )
        `)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;

      // Transform the data to match our types
      const transformedClients: Client[] = clientsData?.map(client => ({
        id: client.id,
        name: client.name,
        address: client.address,
        vat: client.vat,
        phone: client.phone,
        email: client.email,
        notes: client.notes || '',
        createdAt: client.created_at || new Date().toISOString()
      })) || [];

      const transformedItems: Item[] = itemsData?.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        weight: item.weight,
        picture_url: item.picture_url || '',
        description: item.description || '',
        createdAt: item.created_at || new Date().toISOString()
      })) || [];

      const transformedOrders: Order[] = ordersData?.map(order => ({
        id: order.id,
        clientId: order.client_id,
        items: order.order_items?.map((oi: any) => ({
          itemId: oi.item_id,
          quantity: oi.quantity,
          price: oi.price
        })) || [],
        deliveryDate: order.delivery_date,
        status: order.status as 'pending' | 'confirmed' | 'merge' | 'delivered',
        notes: order.notes || '',
        total: order.total,
        createdAt: order.created_at || new Date().toISOString()
      })) || [];

      setClients(transformedClients);
      setItems(transformedItems);
      setOrders(transformedOrders);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Client operations
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: clientData.name,
          address: clientData.address,
          vat: clientData.vat,
          phone: clientData.phone,
          email: clientData.email,
          notes: clientData.notes || null
        }])
        .select()
        .single();

      if (error) throw error;

      const newClient: Client = {
        id: data.id,
        name: data.name,
        address: data.address,
        vat: data.vat,
        phone: data.phone,
        email: data.email,
        notes: data.notes || '',
        createdAt: data.created_at || new Date().toISOString()
      };

      setClients(prev => [newClient, ...prev]);
      return newClient;
    } catch (err) {
      console.error('Error adding client:', err);
      throw err;
    }
  };

  const updateClient = async (id: string, clientData: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: clientData.name,
          address: clientData.address,
          vat: clientData.vat,
          phone: clientData.phone,
          email: clientData.email,
          notes: clientData.notes || null
        })
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.map(client => 
        client.id === id ? { ...client, ...clientData } : client
      ));
    } catch (err) {
      console.error('Error updating client:', err);
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(client => client.id !== id));
      setOrders(prev => prev.filter(order => order.clientId !== id));
    } catch (err) {
      console.error('Error deleting client:', err);
      throw err;
    }
  };

  // Item operations
  const addItem = async (itemData: Omit<Item, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{
          name: itemData.name,
          category: itemData.category,
          price: itemData.price,
          weight: itemData.weight,
          picture_url: itemData.picture_url || null,
          description: itemData.description || null
        }])
        .select()
        .single();

      if (error) throw error;

      const newItem: Item = {
        id: data.id,
        name: data.name,
        category: data.category,
        price: data.price,
        weight: data.weight,
        picture_url: data.picture_url || '',
        description: data.description || '',
        createdAt: data.created_at || new Date().toISOString()
      };

      setItems(prev => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      console.error('Error adding item:', err);
      throw err;
    }
  };

  const updateItem = async (id: string, itemData: Omit<Item, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: itemData.name,
          category: itemData.category,
          price: itemData.price,
          weight: itemData.weight,
          picture_url: itemData.picture_url || null,
          description: itemData.description || null
        })
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...itemData } : item
      ));
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== id));
      // Orders will be updated automatically due to cascade delete in order_items
      await loadAllData(); // Reload to get updated orders
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  };

  // Order operations
  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>) => {
    try {
      // Generate a UUID for the new order
      const orderId = crypto.randomUUID();
      
      // Start a transaction by inserting the order first
      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert([{
          id: orderId,
          client_id: orderData.clientId,
          delivery_date: orderData.deliveryDate,
          status: orderData.status,
          notes: orderData.notes || null,
          total: orderData.total
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      if (orderData.items.length > 0) {
        const orderItemsToInsert = orderData.items.map(item => ({
          order_id: orderId,
          item_id: item.itemId,
          quantity: item.quantity,
          price: item.price
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw itemsError;
      }

      const newOrder: Order = {
        id: orderId,
        clientId: orderResult.client_id,
        items: orderData.items,
        deliveryDate: orderResult.delivery_date,
        status: orderResult.status as 'pending' | 'confirmed' | 'merge' | 'delivered',
        notes: orderResult.notes || '',
        total: orderResult.total,
        createdAt: orderResult.created_at || new Date().toISOString()
      };

      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err) {
      console.error('Error adding order:', err);
      throw err;
    }
  };

  const updateOrder = async (id: string, orderData: Omit<Order, 'id' | 'createdAt'>) => {
    try {
      // Update the order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          client_id: orderData.clientId,
          delivery_date: orderData.deliveryDate,
          status: orderData.status,
          notes: orderData.notes || null,
          total: orderData.total
        })
        .eq('id', id);

      if (orderError) throw orderError;

      // Delete existing order items
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

      if (deleteError) throw deleteError;

      // Insert new order items
      if (orderData.items.length > 0) {
        const orderItemsToInsert = orderData.items.map(item => ({
          order_id: id,
          item_id: item.itemId,
          quantity: item.quantity,
          price: item.price
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw itemsError;
      }

      setOrders(prev => prev.map(order => 
        order.id === id ? { ...order, ...orderData } : order
      ));
    } catch (err) {
      console.error('Error updating order:', err);
      throw err;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== id));
    } catch (err) {
      console.error('Error deleting order:', err);
      throw err;
    }
  };

  const mergeOrders = async (orderIds: string[], newDeliveryDate: string) => {
    try {
      const ordersToMerge = orders.filter(order => orderIds.includes(order.id));

      if (ordersToMerge.length < 2) return;

      const clientId = ordersToMerge[0].clientId;

      // Combine all items
      const combinedItems = ordersToMerge.reduce((allItems, order) => {
        order.items.forEach(orderItem => {
          const existingItem = allItems.find(item => item.itemId === orderItem.itemId);
          if (existingItem) {
            existingItem.quantity += orderItem.quantity;
          } else {
            allItems.push({ ...orderItem });
          }
        });
        return allItems;
      }, [] as OrderItem[]);

      const total = combinedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create merged order with status 'merge'
      const mergedOrderData = {
        clientId,
        items: combinedItems,
        deliveryDate: newDeliveryDate,
        status: 'merge' as const,
        notes: `Merged from orders: ${orderIds.map(id => id.slice(-8)).join(', ')}`,
        total
      };

      await addOrder(mergedOrderData);

      // Update original orders status to 'delivered' instead of deleting them
      for (const orderId of orderIds) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'delivered' })
          .eq('id', orderId);

        if (error) throw error;
      }

      // Reload data to refresh the orders list
      await loadAllData();
    } catch (err) {
      console.error('Error merging orders:', err);
      throw err;
    }
  };

  const updateClientLastOrder = async (clientId: string, orderData: any) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ last_order_json: orderData })
        .eq('id', clientId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating client last order:', err);
      throw err;
    }
  };

  return {
    clients,
    items,
    orders,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    addItem,
    updateItem,
    deleteItem,
    addOrder,
    updateOrder,
    deleteOrder,
    mergeOrders,
    updateClientLastOrder,
    refreshData: loadAllData
  };
}