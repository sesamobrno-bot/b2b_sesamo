import React, { useState, useMemo } from 'react';
import { X, Download, Printer, Calculator } from 'lucide-react';
import { Order, Item } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ProjectionModalProps {
  order: Order;
  items: Item[];
  onClose: () => void;
}

interface ProjectionConfig {
  title: string;
  multipliers: number[];
  vatRate: number;
  foodCostPercent: number;
  foodCostFixed: number;
  discountTiers: { threshold: number; percent: number }[];
  commissionTiers: { threshold: number; percent: number }[];
}

const DEFAULT_CONFIG: ProjectionConfig = {
  title: 'Sesamo Sales Projections',
  multipliers: [20, 50, 100],
  vatRate: 12,
  foodCostPercent: 30,
  foodCostFixed: 0,
  discountTiers: [
    { threshold: 20000, percent: 10 },
    { threshold: 50000, percent: 15 },
    { threshold: 100000, percent: 20 },
  ],
  commissionTiers: [
    { threshold: 50000, percent: 10 },
    { threshold: 100000, percent: 15 },
    { threshold: 150000, percent: 20 },
  ],
};

interface RowData {
  name: string;
  totalQty: number;
  unitPriceNoVat: number;
  totalNoVat: number;
  totalWithVat: number;
  discountPercent: number;
  totalDiscount: number;
  commissionPercent: number;
  commissionTotal: number;
  foodCost: number;
  netForSesamo: number;
  margin: number;
}

function getTierPercent(tiers: { threshold: number; percent: number }[], value: number): number {
  let percent = 0;
  for (const tier of tiers) {
    if (value >= tier.threshold) {
      percent = tier.percent;
    }
  }
  return percent;
}

export default function ProjectionModal({ order, items, onClose }: ProjectionModalProps) {
  const [config, setConfig] = useLocalStorage<ProjectionConfig>('projection-config', DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);

  const orderLineItems = useMemo(() => {
    return order.items.map(oi => {
      const item = items.find(i => i.id === oi.itemId);
      return {
        name: item?.name || 'Unknown Item',
        quantity: oi.quantity,
        price: oi.price,
      };
    });
  }, [order, items]);

  const sections = useMemo(() => {
    return config.multipliers.map(mult => {
      const sectionSubtotal = orderLineItems.reduce(
        (sum, li) => sum + li.price * li.quantity * mult,
        0
      );

      const discountPercent = getTierPercent(config.discountTiers, sectionSubtotal);
      const totalDiscount = sectionSubtotal * (discountPercent / 100);
      const afterDiscount = sectionSubtotal - totalDiscount;

      const commissionPercent = getTierPercent(config.commissionTiers, afterDiscount);
      const commissionTotal = afterDiscount * (commissionPercent / 100);

      const totalWithVat = afterDiscount * (1 + config.vatRate / 100);

      const rows: RowData[] = orderLineItems.map(li => {
        const lineSubtotal = li.price * li.quantity * mult;
        const lineDiscount = lineSubtotal * (discountPercent / 100);
        const lineAfterDiscount = lineSubtotal - lineDiscount;

        const unitPriceNoVat = li.price * (1 - discountPercent / 100);
        const totalNoVat = lineAfterDiscount;
        const lineWithVat = lineAfterDiscount * (1 + config.vatRate / 100);
        const lineDiscountAmount = lineDiscount;

        const lineCommission = lineAfterDiscount * (commissionPercent / 100);

        const lineFoodCost = lineAfterDiscount * (config.foodCostPercent / 100);

        const lineNet = lineAfterDiscount - lineCommission - lineFoodCost;

        return {
          name: li.name,
          totalQty: li.quantity * mult,
          unitPriceNoVat,
          totalNoVat,
          totalWithVat: lineWithVat,
          discountPercent,
          totalDiscount: lineDiscountAmount,
          commissionPercent,
          commissionTotal: lineCommission,
          foodCost: lineFoodCost,
          netForSesamo: lineNet,
          margin: lineAfterDiscount > 0 ? (lineNet / lineAfterDiscount) * 100 : 0,
        };
      });

      const sectionFoodCost = afterDiscount * (config.foodCostPercent / 100) + config.foodCostFixed;

      const sectionNet = afterDiscount - commissionTotal - sectionFoodCost;

      return {
        multiplier: mult,
        sectionSubtotal,
        discountPercent,
        totalDiscount,
        afterDiscount,
        commissionPercent,
        commissionTotal,
        totalWithVat,
        foodCost: sectionFoodCost,
        netForSesamo: sectionNet,
        margin: afterDiscount > 0 ? (sectionNet / afterDiscount) * 100 : 0,
        rows,
      };
    });
  }, [orderLineItems, config]);

  const formatNum = (n: number) => n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatInt = (n: number) => n.toLocaleString('cs-CZ', { maximumFractionDigits: 0 });

  const handleExportTSV = () => {
    const headers = [
      'Item', 'Total Qty', 'Unit Price (no VAT, after discount)', 'Total (no VAT, after discount)',
      'Total (with VAT)', 'Discount %', 'Total Discount', 'Commission %', 'Commission Total',
      'Food Cost', 'Net for Sesamo', 'Margin %',
    ];

    const lines: string[] = [];
    lines.push(`# ${config.title}`);
    lines.push(`# Date: ${new Date().toLocaleDateString()}`);
    lines.push(`# Order: #${order.id.slice(-8)}`);
    lines.push('');
    lines.push(headers.join('\t'));

    for (const section of sections) {
      lines.push('');
      lines.push(`## Section x${section.multiplier} | Subtotal: ${formatNum(section.sectionSubtotal)} | Discount: ${section.discountPercent}% | Commission: ${section.commissionPercent}% | Net for Sesamo: ${formatNum(section.netForSesamo)}`);
      for (const row of section.rows) {
        lines.push([
          row.name, formatInt(row.totalQty), formatNum(row.unitPriceNoVat), formatNum(row.totalNoVat),
          formatNum(row.totalWithVat), `${row.discountPercent}%`, formatNum(row.totalDiscount),
          `${row.commissionPercent}%`, formatNum(row.commissionTotal), formatNum(row.foodCost), formatNum(row.netForSesamo), `${row.margin.toFixed(1)}%`,
        ].join('\t'));
      }
      lines.push(['SECTION TOTAL x' + section.multiplier, '', '', formatNum(section.afterDiscount), formatNum(section.totalWithVat), `${section.discountPercent}%`, formatNum(section.totalDiscount), `${section.commissionPercent}%`, formatNum(section.commissionTotal), formatNum(section.foodCost), formatNum(section.netForSesamo), `${section.margin.toFixed(1)}%`].join('\t'));
    }

    const tsv = lines.join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projections-order-${order.id.slice(-8)}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateMultiplier = (index: number, value: number) => {
    setConfig(prev => ({
      ...prev,
      multipliers: prev.multipliers.map((m, i) => (i === index ? value : m)),
    }));
  };

  const addMultiplier = () => {
    setConfig(prev => ({ ...prev, multipliers: [...prev.multipliers, 10] }));
  };

  const removeMultiplier = (index: number) => {
    setConfig(prev => ({ ...prev, multipliers: prev.multipliers.filter((_, i) => i !== index) }));
  };

  const updateDiscountTier = (index: number, field: 'threshold' | 'percent', value: number) => {
    setConfig(prev => ({
      ...prev,
      discountTiers: prev.discountTiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  };

  const updateCommissionTier = (index: number, field: 'threshold' | 'percent', value: number) => {
    setConfig(prev => ({
      ...prev,
      commissionTiers: prev.commissionTiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  };

  const inputClass = "w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <Calculator className="text-orange-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
              <p className="text-sm text-gray-500">
                Order #{order.id.slice(-8)} · {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfig(s => !s)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Settings
            </button>
            <button
              onClick={handleExportTSV}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download size={16} />
              TSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Printer size={16} />
              Print
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Config Panel */}
          {showConfig && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4 print:hidden">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-800">Projection Settings</h4>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Title</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Multipliers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Multipliers</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {config.multipliers.map((m, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">×</span>
                      <input
                        type="number"
                        value={m}
                        onChange={e => updateMultiplier(i, Number(e.target.value))}
                        className={inputClass}
                      />
                      <button
                        onClick={() => removeMultiplier(i)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addMultiplier}
                    className="px-3 py-1 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* VAT + Food Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    value={config.vatRate}
                    onChange={e => setConfig(prev => ({ ...prev, vatRate: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Cost (%)</label>
                  <input
                    type="number"
                    value={config.foodCostPercent}
                    onChange={e => setConfig(prev => ({ ...prev, foodCostPercent: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Cost Fixed (flat per section, Kč)</label>
                  <input
                    type="number"
                    value={config.foodCostFixed}
                    onChange={e => setConfig(prev => ({ ...prev, foodCostFixed: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Discount Tiers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Tiers (from threshold → %)</label>
                <div className="space-y-2">
                  {config.discountTiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20">From</span>
                      <input
                        type="number"
                        value={t.threshold}
                        onChange={e => updateDiscountTier(i, 'threshold', Number(e.target.value))}
                        className={inputClass}
                      />
                      <span className="text-gray-500">Kč →</span>
                      <input
                        type="number"
                        value={t.percent}
                        onChange={e => updateDiscountTier(i, 'percent', Number(e.target.value))}
                        className={inputClass}
                      />
                      <span className="text-gray-500">% discount</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission Tiers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Tiers (up to threshold → %)</label>
                <div className="space-y-2">
                  {config.commissionTiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20">From</span>
                      <input
                        type="number"
                        value={t.threshold}
                        onChange={e => updateCommissionTier(i, 'threshold', Number(e.target.value))}
                        className={inputClass}
                      />
                      <span className="text-gray-500">Kč →</span>
                      <input
                        type="number"
                        value={t.percent}
                        onChange={e => updateCommissionTier(i, 'percent', Number(e.target.value))}
                        className={inputClass}
                      />
                      <span className="text-gray-500">% commission</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Settings are saved in your browser and remembered next time. Food cost = (after-discount total × {config.foodCostPercent}%) + {config.foodCostFixed} Kč flat per section.
              </p>
            </div>
          )}

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.multiplier} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
                <h4 className="font-semibold text-orange-800">
                  Section × {section.multiplier}
                </h4>
                <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                  <span>Subtotal: <strong>{formatNum(section.sectionSubtotal)} Kč</strong></span>
                  <span>Discount: <strong>{section.discountPercent}%</strong> (−{formatNum(section.totalDiscount)} Kč)</span>
                  <span>After discount: <strong>{formatNum(section.afterDiscount)} Kč</strong></span>
                  <span>Commission: <strong>{section.commissionPercent}%</strong> (−{formatNum(section.commissionTotal)} Kč)</span>
                  <span>With VAT: <strong>{formatNum(section.totalWithVat)} Kč</strong></span>
                  <span>Food cost: <strong>{formatNum(section.foodCost)} Kč</strong></span>
                  <span className="text-orange-700">Net for Sesamo: <strong>{formatNum(section.netForSesamo)} Kč</strong></span>
                  <span className="text-green-700">Margin: <strong>{section.margin.toFixed(1)}%</strong></span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-left">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium text-right">Total Qty</th>
                      <th className="px-3 py-2 font-medium text-right">Unit Price<br/>(no VAT, after disc.)</th>
                      <th className="px-3 py-2 font-medium text-right">Total<br/>(no VAT, after disc.)</th>
                      <th className="px-3 py-2 font-medium text-right">Total<br/>(with VAT)</th>
                      <th className="px-3 py-2 font-medium text-right">Disc. %</th>
                      <th className="px-3 py-2 font-medium text-right">Total Discount</th>
                      <th className="px-3 py-2 font-medium text-right">Comm. %</th>
                      <th className="px-3 py-2 font-medium text-right">Commission Total</th>
                      <th className="px-3 py-2 font-medium text-right">Food Cost</th>
                      <th className="px-3 py-2 font-medium text-right">Net for Sesamo</th>
                      <th className="px-3 py-2 font-medium text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">{row.name}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatInt(row.totalQty)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNum(row.unitPriceNoVat)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNum(row.totalNoVat)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNum(row.totalWithVat)}</td>
                        <td className="px-3 py-2 text-right">{row.discountPercent}%</td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">−{formatNum(row.totalDiscount)}</td>
                        <td className="px-3 py-2 text-right">{row.commissionPercent}%</td>
                        <td className="px-3 py-2 text-right font-mono text-blue-600">−{formatNum(row.commissionTotal)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600">−{formatNum(row.foodCost)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-orange-700">{formatNum(row.netForSesamo)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-green-700">{row.margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2 text-gray-900">SECTION TOTAL × {section.multiplier}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right font-mono">{formatNum(section.afterDiscount)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatNum(section.totalWithVat)}</td>
                      <td className="px-3 py-2 text-right">{section.discountPercent}%</td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">−{formatNum(section.totalDiscount)}</td>
                      <td className="px-3 py-2 text-right">{section.commissionPercent}%</td>
                      <td className="px-3 py-2 text-right font-mono text-blue-600">−{formatNum(section.commissionTotal)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">−{formatNum(section.foodCost)}</td>
                      <td className="px-3 py-2 text-right font-mono text-orange-700">{formatNum(section.netForSesamo)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-green-700">{section.margin.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
