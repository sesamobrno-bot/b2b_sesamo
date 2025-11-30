import React, { useState, useEffect } from 'react';
import Joyride from 'react-joyride';
import { Client, Item, Order } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Copy, ShoppingCart, Calendar, Package, LogOut, User as UserIcon, Building2, Phone, Mail, Edit2, List, BookOpen, Trash2, Download, Grid3x3, LayoutList, HelpCircle } from 'lucide-react';
import ClientOrderForm, { ClientOrderFormData } from './ClientOrderForm';
import { calculateDiscount } from '../utils/discountCalculator';
import { generateOrderPDF } from '../utils/pdfGenerator';
import { useTour } from '../context/TourContext';
import { LanguageSelector } from './LanguageSelector';
import { clientTourSteps } from '../constants/tourSteps';

interface ClientDashboardProps {
  clientData: Client;
}

type OrderSection = 'pending' | 'confirmed' | 'delivered';
type ClientTab = 'orders' | 'catalog';
type ViewMode = 'cards' | 'compact';

export default function ClientDashboard({ clientData }: ClientDashboardProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<ClientOrderFormData | undefined>();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>('orders');
  const [notification, setNotification] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const {
    language,
    setLanguage,
    isLanguageSelected,
    setIsLanguageSelected,
    showTour,
    setShowTour
  } = useTour();

  useEffect(() => {
    loadData();
  }, [clientData.id]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('clientTourLanguage');
    if (savedLanguage) {
      setLanguage(savedLanguage as 'en' | 'cs');
      setIsLanguageSelected(true);
    }
  }, [setLanguage, setIsLanguageSelected]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true });

      if (itemsError) throw itemsError;

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
        .eq('client_id', clientData.id)
        .in('status', ['pending', 'confirmed', 'delivered'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

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

      setItems(transformedItems);
      setPendingOrders(transformedOrders.filter(o => o.status === 'pending'));
      setConfirmedOrders(transformedOrders.filter(o => o.status === 'confirmed'));
      setDeliveredOrders(transformedOrders.filter(o => o.status === 'delivered'));
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateOrder = () => {
    setInitialFormData(undefined);
    setIsModalOpen(true);
  };

  const handleDuplicateLastOrder = async () => {
    try {
      const { data: clientRecord, error } = await supabase
        .from('clients')
        .select('last_order_json')
        .eq('id', clientData.id)
        .single();

      if (error) throw error;

      if (clientRecord?.last_order_json) {
        const lastOrder = clientRecord.last_order_json as ClientOrderFormData;
        setInitialFormData({
          deliveryDate: '',
          notes: lastOrder.notes || '',
          items: lastOrder.items
        });
        setIsModalOpen(true);
      } else {
        alert('No previous order found. Please create a new order.');
      }
    } catch (err) {
      console.error('Error loading last order:', err);
      alert('Failed to load last order. Please try again.');
    }
  };

  const handleEditOrder = (order: Order) => {
    const formData: ClientOrderFormData = {
      deliveryDate: order.deliveryDate,
      notes: order.notes,
      items: order.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity
      }))
    };
    setInitialFormData(formData);
    setEditingOrderId(order.id);
    setIsModalOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      loadData();
    } catch (err) {
      console.error('Error deleting order:', err);
      alert('Failed to delete order. Please try again.');
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddToCart = async (item: Item) => {
    try {
      let targetOrder = pendingOrders.find(order => order.status === 'pending');

      if (!targetOrder) {
        const today = new Date().toISOString().split('T')[0];
        const newOrderId = crypto.randomUUID();

        const { error: orderError } = await supabase
          .from('orders')
          .insert([{
            id: newOrderId,
            client_id: clientData.id,
            delivery_date: today,
            status: 'pending',
            total: item.price
          }]);

        if (orderError) throw orderError;

        const { error: itemError } = await supabase
          .from('order_items')
          .insert([{
            order_id: newOrderId,
            item_id: item.id,
            quantity: 1,
            price: item.price
          }]);

        if (itemError) throw itemError;

        showNotification(`${item.name} added to new order!`);
      } else {
        const existingItem = targetOrder.items.find(oi => oi.itemId === item.id);

        if (existingItem) {
          const newQuantity = existingItem.quantity + 1;
          const { error } = await supabase
            .from('order_items')
            .update({ quantity: newQuantity })
            .eq('order_id', targetOrder.id)
            .eq('item_id', item.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('order_items')
            .insert([{
              order_id: targetOrder.id,
              item_id: item.id,
              quantity: 1,
              price: item.price
            }]);

          if (error) throw error;
        }

        const newTotal = targetOrder.total + item.price;
        await supabase
          .from('orders')
          .update({ total: newTotal })
          .eq('id', targetOrder.id);

        showNotification(`${item.name} added to order!`);
      }

      await loadData();
    } catch (err) {
      console.error('Error adding item to cart:', err);
      alert('Failed to add item to cart. Please try again.');
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    try {
      const orderItems = order.items.map(orderItem => {
        const item = items.find(i => i.id === orderItem.itemId);
        return {
          itemId: orderItem.itemId,
          quantity: orderItem.quantity,
          price: orderItem.price,
          name: item?.name || 'Unknown Item'
        };
      });

      await generateOrderPDF(order, clientData, orderItems);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const renderCompactRow = (order: Order, canEdit: boolean) => {
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountInfo = calculateDiscount(subtotal);

    return (
      <div key={order.id} className="flex items-center gap-4 px-4 py-3 bg-white border-b hover:bg-gray-50 transition-colors">
        <span className="font-mono text-sm font-semibold text-gray-900 w-20 flex-shrink-0">
          #{order.id.slice(-8)}
        </span>
        <span className="text-sm text-gray-600 w-40 flex-shrink-0">
          {new Date(order.deliveryDate).toLocaleDateString()}
        </span>
        <span className="text-sm text-gray-600 w-24 flex-shrink-0 text-right">
          {subtotal.toFixed(2)} Kč
        </span>
        {discountInfo.discount > 0 && (
          <>
            <span className="text-sm text-green-600 w-24 flex-shrink-0 text-right">
              -{discountInfo.discount.toFixed(2)} Kč
            </span>
            <span className="text-sm font-semibold text-orange-600 w-28 flex-shrink-0 text-right">
              {discountInfo.finalTotal.toFixed(2)} Kč
            </span>
          </>
        )}
        {discountInfo.discount === 0 && (
          <span className="text-sm font-semibold text-gray-900 w-28 flex-shrink-0 text-right">
            {order.total.toFixed(2)} Kč
          </span>
        )}
        <div className="flex gap-2 flex-shrink-0 ml-auto">
          {canEdit && (
            <>
              <button
                onClick={() => handleEditOrder(order)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteOrder(order.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          {!canEdit && (
            <button
              onClick={() => handleDownloadPDF(order)}
              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Download PDF"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderOrderCard = (order: Order, canEdit: boolean) => {
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountInfo = calculateDiscount(subtotal);

    const getStatusConfig = () => {
      switch (order.status) {
        case 'pending':
          return { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800' };
        case 'confirmed':
          return { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-800' };
        case 'delivered':
          return { label: 'Paid', bg: 'bg-green-100', text: 'text-green-800' };
        default:
          return { label: 'Unknown', bg: 'bg-gray-100', text: 'text-gray-800' };
      }
    };

    const statusConfig = getStatusConfig();

    return (
      <div key={order.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="text-orange-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Order #{order.id.slice(-8)}</h3>
                <p className="text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => handleEditOrder(order)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteOrder(order.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
            {!canEdit && (
              <button
                onClick={() => handleDownloadPDF(order)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
              >
                <Download size={16} />
                Download PDF
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={16} />
            <span>Delivery: {new Date(order.deliveryDate).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Package size={16} />
            <span>{order.items.length} item(s)</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="space-y-1">
              {order.items.map((orderItem) => {
                const item = items.find(i => i.id === orderItem.itemId);
                return (
                  <div key={orderItem.itemId} className="flex justify-between text-xs">
                    <span className="truncate">{item?.name || 'Unknown Item'} × {orderItem.quantity}</span>
                    <span>{(orderItem.price * orderItem.quantity).toFixed(2)} Kč</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-2 mt-2 space-y-1">
              {discountInfo.discount > 0 ? (
                <>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal:</span>
                    <span>{discountInfo.subtotal.toFixed(2)} Kč</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount ({discountInfo.discountPercentage}%):</span>
                    <span>-{discountInfo.discount.toFixed(2)} Kč</span>
                  </div>
                  <div className="flex justify-between font-semibold text-orange-600">
                    <span>Total:</span>
                    <span>{discountInfo.finalTotal.toFixed(2)} Kč</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{order.total.toFixed(2)} Kč</span>
                </div>
              )}
            </div>
          </div>

          {order.notes && (
            <div className="text-gray-600 text-xs">
              <span className="font-medium">Notes:</span> {order.notes}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSubmitOrder = async (formData: ClientOrderFormData) => {
    try {
      const orderItems = formData.items.map(item => {
        const itemData = items.find(i => i.id === item.itemId);
        return {
          itemId: item.itemId,
          quantity: Number(item.quantity),
          price: itemData?.price || 0
        };
      });

      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountInfo = calculateDiscount(subtotal);

      if (editingOrderId) {
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', editingOrderId);

        const { error: orderError } = await supabase
          .from('orders')
          .update({
            delivery_date: formData.deliveryDate,
            notes: formData.notes || null,
            total: discountInfo.finalTotal
          })
          .eq('id', editingOrderId);

        if (orderError) throw orderError;

        if (orderItems.length > 0) {
          const orderItemsToInsert = orderItems.map(item => ({
            order_id: editingOrderId,
            item_id: item.itemId,
            quantity: item.quantity,
            price: item.price
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

          if (itemsError) throw itemsError;
        }
      } else {
        const orderId = crypto.randomUUID();

        const { error: orderError } = await supabase
          .from('orders')
          .insert([{
            id: orderId,
            client_id: clientData.id,
            delivery_date: formData.deliveryDate,
            status: 'pending',
            notes: formData.notes || null,
            total: discountInfo.finalTotal
          }]);

        if (orderError) throw orderError;

        if (orderItems.length > 0) {
          const orderItemsToInsert = orderItems.map(item => ({
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
      }

      await supabase
        .from('clients')
        .update({ last_order_json: formData })
        .eq('id', clientData.id);

      setIsModalOpen(false);
      setInitialFormData(undefined);
      setEditingOrderId(null);
      loadData();
    } catch (err) {
      console.error('Error saving order:', err);
      alert('Failed to save order. Please try again.');
    }
  };

  const handleLanguageSelect = (lang: 'en' | 'cs') => {
    setLanguage(lang);
    localStorage.setItem('clientTourLanguage', lang);
    setIsLanguageSelected(true);
    setShowTour(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLanguageSelected && (
        <LanguageSelector onSelectLanguage={handleLanguageSelect} />
      )}
      <Joyride
        steps={clientTourSteps[language]}
        run={showTour}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            primaryColor: '#ea580c',
            textColor: '#1f2937',
            backgroundColor: '#ffffff',
            arrowColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltip: {
            borderRadius: 8,
            padding: '16px',
          },
          buttonNext: {
            backgroundColor: '#ea580c',
            color: '#ffffff',
            borderRadius: 6,
            fontSize: 14,
            padding: '8px 16px',
          },
          buttonSkip: {
            color: '#6b7280',
            fontSize: 13,
          },
        }}
        callback={(data) => {
          if (data.action === 'close' || data.action === 'skip' || data.status === 'finished') {
            setShowTour(false);
          }
        }}
      />
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Package size={20} />
            <span>{notification}</span>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Sesamo - Client Portal</h1>
            <div className="flex items-center gap-4">
              <button
                data-tour="client-help-button"
                onClick={() => setShowTour(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                title="Start tour"
              >
                <HelpCircle size={16} />
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Building2 className="text-orange-600" size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{clientData.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400" />
                  <span>VAT: {clientData.vat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{clientData.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span>{clientData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon size={16} className="text-gray-400" />
                  <span>{clientData.address}</span>
                </div>
              </div>
              {clientData.notes && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {clientData.notes}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8">
              <button
                data-tour="client-tab-orders"
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'orders'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ShoppingCart size={20} />
                Orders
              </button>
              <button
                data-tour="client-tab-catalog"
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'catalog'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BookOpen size={20} />
                Catalog
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'orders' && (
          <>
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    data-tour="client-create-order"
                    onClick={handleCreateOrder}
                    className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                  >
                    <Plus size={20} />
                    Create New Order
                  </button>
                  <button
                    onClick={handleDuplicateLastOrder}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                  >
                    <Copy size={20} />
                    Duplicate Last Order
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'cards'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Card view"
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'compact'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Compact view"
                  >
                    <LayoutList size={18} />
                  </button>
                </div>
              </div>
            </div>

        <div className="space-y-8">
          <div data-tour="client-pending-orders">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit2 size={20} className="text-yellow-600" />
              Pending Orders
            </h3>
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create your first order to get started.
                </p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingOrders.map((order) => renderOrderCard(order, true))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-100 border-b font-semibold text-sm text-gray-700">
                  <span className="w-20 flex-shrink-0">ID</span>
                  <span className="w-40 flex-shrink-0">Delivery</span>
                  <span className="w-24 flex-shrink-0 text-right">Subtotal</span>
                  {pendingOrders.some(o => calculateDiscount(o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).discount > 0) && (
                    <>
                      <span className="w-24 flex-shrink-0 text-right">Discount</span>
                      <span className="w-28 flex-shrink-0 text-right">Total</span>
                    </>
                  )}
                  {!pendingOrders.some(o => calculateDiscount(o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).discount > 0) && (
                    <span className="w-28 flex-shrink-0 text-right">Total</span>
                  )}
                  <div className="flex-shrink-0 ml-auto w-16"></div>
                </div>
                {pendingOrders.map((order) => renderCompactRow(order, true))}
              </div>
            )}
          </div>

          <div data-tour="client-confirmed-orders">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-blue-600" />
              Confirmed Orders of the Month
            </h3>
            {confirmedOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No confirmed orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Orders being confirmed will appear here.
                </p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {confirmedOrders.map((order) => renderOrderCard(order, false))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-100 border-b font-semibold text-sm text-gray-700">
                  <span className="w-20 flex-shrink-0">ID</span>
                  <span className="w-40 flex-shrink-0">Delivery</span>
                  <span className="w-24 flex-shrink-0 text-right">Subtotal</span>
                  {confirmedOrders.some(o => calculateDiscount(o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).discount > 0) && (
                    <>
                      <span className="w-24 flex-shrink-0 text-right">Discount</span>
                      <span className="w-28 flex-shrink-0 text-right">Total</span>
                    </>
                  )}
                  {!confirmedOrders.some(o => calculateDiscount(o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).discount > 0) && (
                    <span className="w-28 flex-shrink-0 text-right">Total</span>
                  )}
                  <div className="flex-shrink-0 ml-auto w-16"></div>
                </div>
                {confirmedOrders.map((order) => renderCompactRow(order, false))}
              </div>
            )}
          </div>

          <div data-tour="client-paid-orders">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <List size={20} className="text-green-600" />
              Paid Orders
            </h3>
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <List className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No paid orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Completed orders will appear here.
                </p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {deliveredOrders.map((order) => renderOrderCard(order, false))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-100 border-b font-semibold text-sm text-gray-700">
                  <span className="w-20 flex-shrink-0">ID</span>
                  <span className="w-40 flex-shrink-0">Delivery</span>
                  <span className="w-24 flex-shrink-0 text-right">Subtotal</span>
                  {deliveredOrders.some(o => calculateDiscount(o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).discount > 0) && (
                    <>
                      <span className="w-24 flex-shrink-0 text-right">Discount</span>
                      <span className="w-28 flex-shrink-0 text-right">Total</span>
                    </>
                  )}
                  {!deliveredOrders.some(o => calculateDiscount(o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).discount > 0) && (
                    <span className="w-28 flex-shrink-0 text-right">Total</span>
                  )}
                  <div className="flex-shrink-0 ml-auto w-16"></div>
                </div>
                {deliveredOrders.map((order) => renderCompactRow(order, false))}
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {activeTab === 'catalog' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Product Catalog</h3>
            {items.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The catalog is currently empty.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    {item.picture_url && (
                      <div className="h-48 bg-gray-200 overflow-hidden">
                        <img
                          src={item.picture_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{item.name}</h4>
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full mt-1">
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex justify-between items-center pt-3 border-t">
                        <div>
                          <p className="text-lg font-bold text-orange-600">{item.price.toFixed(2)} Kč</p>
                          <p className="text-xs text-gray-500">{item.weight}kg</p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="flex items-center justify-center w-10 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-full transition-colors"
                          title="Add to cart"
                        >
                          <ShoppingCart size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingOrderId ? 'Edit Order' : initialFormData ? 'Duplicate Order' : 'Create New Order'}
              </h3>
            </div>
            <div className="p-6">
              <ClientOrderForm
                clientId={clientData.id}
                items={items}
                onSubmit={handleSubmitOrder}
                onCancel={() => {
                  setIsModalOpen(false);
                  setInitialFormData(undefined);
                  setEditingOrderId(null);
                }}
                initialData={initialFormData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
