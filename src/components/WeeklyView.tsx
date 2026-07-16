import React, { useState, useMemo } from 'react';
import { CreditCard as Edit2, Trash2, Copy, Printer, DollarSign, Repeat } from 'lucide-react';
import { Order, Client, Item } from '../types';
import { calculateDiscount } from '../utils/discountCalculator';

interface WeeklyViewProps {
  orders: Order[];
  clients: Client[];
  items: Item[];
  onEditOrder: (order: Order) => void;
  onCopyOrder: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onDuplicateWeek: (sourceWeekStart: string, targetWeekStart: string) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startStr = weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const endStr = weekEnd.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${startStr} – ${endStr}`;
}

export default function WeeklyView({
  orders,
  clients,
  items,
  onEditOrder,
  onCopyOrder,
  onDeleteOrder,
  onDuplicateWeek,
}: WeeklyViewProps) {
  const [showCosts, setShowCosts] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState<{ weekStart: string } | null>(null);

  const filteredOrders = useMemo(
    () => orders.filter(o => o.status !== 'merge'),
    [orders]
  );

  const weeks = useMemo(() => {
    const weekMap = new Map<string, Map<string, Order[]>>();

    for (const order of filteredOrders) {
      const [y, m, d] = order.deliveryDate.split('T')[0].split('-').map(Number);
      const orderDate = new Date(y, m - 1, d);
      const weekStart = getWeekStart(orderDate);
      const weekKey = formatDateKey(weekStart);

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, new Map());
      }
      const dayMap = weekMap.get(weekKey)!;
      const dayKey = formatDateKey(orderDate);
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey)!.push(order);
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekKey, dayMap]) => {
        const [wy, wm, wd] = weekKey.split('-').map(Number);
        const weekStart = new Date(wy, wm - 1, wd);
        const days = Array.from({ length: 7 }, (_, i) => {
          const dayDate = addDays(weekStart, i);
          const dayKey = formatDateKey(dayDate);
          return {
            date: dayDate,
            key: dayKey,
            orders: dayMap.get(dayKey) || [],
          };
        });
        return { weekStart, weekKey, days };
      });
  }, [filteredOrders]);

  const handleDuplicate = (weekKey: string, targetOffset: number) => {
    const [sy, sm, sd] = weekKey.split('-').map(Number);
    const sourceDate = new Date(sy, sm - 1, sd);
    const targetDate = addDays(sourceDate, targetOffset * 7);
    onDuplicateWeek(weekKey, formatDateKey(targetDate));
    setDuplicateModal(null);
  };

  const renderItemLine = (order: Order, orderItem: { itemId: string; quantity: number; price: number }) => {
    const item = items.find(i => i.id === orderItem.itemId);
    const lineTotal = orderItem.price * orderItem.quantity;
    return (
      <div key={orderItem.itemId} className="flex justify-between items-baseline">
        <span className="truncate">
          {orderItem.quantity}× {item?.name || 'Unknown'}
        </span>
        <span className="weekly-cost flex-shrink-0 ml-1 text-gray-500">
          {lineTotal.toFixed(0)}
        </span>
      </div>
    );
  };

  const renderOrderTotal = (order: Order) => {
    const subtotal = order.items.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
    const discountInfo = calculateDiscount(subtotal);
    return (
      <div className="weekly-cost border-t border-gray-200 mt-0.5 pt-0.5 flex justify-between font-semibold">
        <span>Total</span>
        <span>{discountInfo.finalTotal.toFixed(0)}</span>
      </div>
    );
  };

  const renderOrderBlock = (order: Order) => {
    const client = clients.find(c => c.id === order.clientId);
    return (
      <div className="weekly-order group border-l-2 border-gray-200 pl-1.5 py-0.5 hover:border-orange-400 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-medium truncate">{client?.name || 'Unknown'}</span>
          <div className="weekly-actions opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 flex-shrink-0">
            <button
              onClick={() => onEditOrder(order)}
              className="p-0.5 text-gray-400 hover:text-orange-600"
              title="Edit"
            >
              <Edit2 size={11} />
            </button>
            <button
              onClick={() => onCopyOrder(order)}
              className="p-0.5 text-gray-400 hover:text-blue-600"
              title="Copy"
            >
              <Copy size={11} />
            </button>
            <button
              onClick={() => onDeleteOrder(order)}
              className="p-0.5 text-gray-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
        <div className="space-y-0">
          {order.items.map(oi => renderItemLine(order, oi))}
          {renderOrderTotal(order)}
        </div>
      </div>
    );
  };

  const renderDayCell = (day: { date: Date; key: string; orders: Order[] }) => {
    const hasOrders = day.orders.length > 0;
    const isToday = formatDateKey(new Date()) === day.key;
    return (
      <div
        key={day.key}
        className={`weekly-day-cell border border-gray-200 rounded p-1 min-h-[60px] ${
          hasOrders ? 'bg-white' : 'bg-gray-50'
        } ${isToday ? 'ring-1 ring-orange-300' : ''}`}
      >
        <div className="text-[10px] font-medium text-gray-400 mb-0.5">
          {DAY_NAMES[day.date.getDay() === 0 ? 6 : day.date.getDay() - 1]} {day.date.getDate()}/{day.date.getMonth() + 1}
        </div>
        {hasOrders ? (
          <div className="space-y-1">
            {day.orders.map(order => renderOrderBlock(order))}
          </div>
        ) : (
          <div className="text-[10px] text-gray-300 italic">—</div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 weekly-view-container ${showCosts ? 'weekly-costs-visible' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <div className="text-sm text-gray-600">
          {weeks.length} week{weeks.length !== 1 ? 's' : ''} with orders
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCosts(!showCosts)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showCosts
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle cost visibility"
          >
            <DollarSign size={16} />
            {showCosts ? 'Hide costs' : 'Weekly cost'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Print weekly view"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {/* Weeks */}
      {weeks.map(week => (
        <div key={week.weekKey} className="weekly-week-block border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          {/* Week header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200 print:bg-transparent">
            <span className="text-sm font-semibold text-gray-700">
              Week {formatWeekRange(week.weekStart)}
            </span>
            <button
              onClick={() => setDuplicateModal({ weekStart: week.weekKey })}
              className="weekly-actions flex items-center gap-1 text-xs px-2 py-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors print:hidden"
              title="Duplicate this week's orders"
            >
              <Repeat size={13} />
              Duplicate week
            </button>
          </div>

          {/* Day columns */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 print:gap-0">
            {week.days.map(day => renderDayCell(day))}
          </div>
        </div>
      ))}

      {weeks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No orders to display.
        </div>
      )}

      {/* Duplicate week modal */}
      {duplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Duplicate week's orders?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will copy all orders from the week of{' '}
              {formatWeekRange((() => { const [y, m, d] = duplicateModal.weekStart.split('-').map(Number); return new Date(y, m - 1, d); })())}{' '}
              to the selected target week, preserving client and item assignments day by day.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDuplicate(duplicateModal.weekStart, 1)}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Yes, for next week
              </button>
              <button
                onClick={() => handleDuplicate(duplicateModal.weekStart, 0)}
                className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
              >
                Yes, for this week
              </button>
              <button
                onClick={() => setDuplicateModal(null)}
                className="w-full px-4 py-2.5 text-gray-500 hover:text-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
