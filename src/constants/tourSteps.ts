export type Language = 'en' | 'cs';

export const tourSteps = {
  en: [
    {
      target: 'body',
      content: 'Welcome to the Order Management System! Let me show you around.',
      placement: 'center' as const,
    },
    {
      target: '[data-tour="tab-orders"]',
      content: 'This is the Orders tab. Here you can view, create, and manage all your orders.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-clients"]',
      content: 'The Clients tab lets you manage all your clients, their contact information, and order history.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-items"]',
      content: 'The Items tab (CAT) is your product catalog. Here you can add, edit, and remove items.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-merge"]',
      content: 'The Merge tab (X) allows you to combine multiple pending orders for efficient delivery.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-reports"]',
      content: 'The Reports tab (RPT) provides analytics and insights about your orders and clients.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="help-button"]',
      content: 'Click here anytime to restart this tour or switch languages.',
      placement: 'left' as const,
    },
    {
      target: 'body',
      content: 'That\'s the basics! Start by exploring the Orders tab to get familiar with the system.',
      placement: 'center' as const,
    },
  ],
  cs: [
    {
      target: 'body',
      content: 'Vítejte v systému správy objednávek! Pojďme si zde projít.',
      placement: 'center' as const,
    },
    {
      target: '[data-tour="tab-orders"]',
      content: 'Toto je záložka Objednávky. Zde můžete zobrazit, vytvořit a spravovat všechny své objednávky.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-clients"]',
      content: 'Záložka Klienti vám umožní spravovat všechny své klienty, jejich kontaktní údaje a historii objednávek.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-items"]',
      content: 'Záložka Položky (CAT) je váš katalog produktů. Zde můžete přidávat, upravovat a odstraňovat položky.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-merge"]',
      content: 'Záložka Sloučit (X) vám umožní kombinovat více nevyřízených objednávek pro efektivní doručení.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="tab-reports"]',
      content: 'Záložka Zprávy (RPT) poskytuje analýzy a přehledy o vašich objednávkách a klientech.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="help-button"]',
      content: 'Klikněte zde kdykoliv, abyste restartovali tuto prohlídku nebo si vybrali jazyk.',
      placement: 'left' as const,
    },
    {
      target: 'body',
      content: 'To jsou základy! Začněte průzkumem záložky Objednávky, abyste se s tímto systémem seznámili.',
      placement: 'center' as const,
    },
  ],
};

export const clientTourSteps = {
  en: [
    {
      target: 'body',
      content: 'Welcome to your Client Portal! Let me show you how to place and manage your orders.',
      placement: 'center' as const,
    },
    {
      target: '[data-tour="client-tab-orders"]',
      content: 'This is the Orders tab where you can view all your orders and their current status.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="client-tab-catalog"]',
      content: 'The Catalog tab displays all available products. You can browse items and add them directly to your cart.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="client-create-order"]',
      content: 'Click here to create a new order from scratch. You can select products and specify quantities.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="client-pending-orders"]',
      content: 'Pending Orders are orders you have created but not yet confirmed by us. You can still edit or delete these orders.',
      placement: 'top' as const,
    },
    {
      target: '[data-tour="client-confirmed-orders"]',
      content: 'Confirmed Orders of the Month are orders we have processed for the current month. You can download the delivery list (Dodaci list) for these orders.',
      placement: 'top' as const,
    },
    {
      target: '[data-tour="client-paid-orders"]',
      content: 'Paid Orders contain orders from previous months that have been invoiced and completed.',
      placement: 'top' as const,
    },
    {
      target: '[data-tour="client-help-button"]',
      content: 'Click here anytime to restart this tour or switch languages.',
      placement: 'left' as const,
    },
    {
      target: 'body',
      content: 'You are all set! Start by browsing the catalog or creating your first order.',
      placement: 'center' as const,
    },
  ],
  cs: [
    {
      target: 'body',
      content: 'Vítejte na vašem klientském portálu! Ukážu vám, jak zadávat a spravovat vaše objednávky.',
      placement: 'center' as const,
    },
    {
      target: '[data-tour="client-tab-orders"]',
      content: 'Toto je záložka Objednávky, kde můžete zobrazit všechny své objednávky a jejich aktuální stav.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="client-tab-catalog"]',
      content: 'Záložka Katalog zobrazuje všechny dostupné produkty. Můžete procházet položky a přidávat je přímo do košíku.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="client-create-order"]',
      content: 'Klikněte zde pro vytvoření nové objednávky od začátku. Můžete vybrat produkty a určit množství.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="client-pending-orders"]',
      content: 'Čekající objednávky jsou objednávky, které jste vytvořili, ale ještě nebyly námi potvrzeny. Tyto objednávky můžete stále upravovat nebo smazat.',
      placement: 'top' as const,
    },
    {
      target: '[data-tour="client-confirmed-orders"]',
      content: 'Potvrzené objednávky měsíce jsou objednávky, které jsme zpracovali pro aktuální měsíc. U těchto objednávek můžete stáhnout dodací list.',
      placement: 'top' as const,
    },
    {
      target: '[data-tour="client-paid-orders"]',
      content: 'Zaplacené objednávky obsahují objednávky z předchozích měsíců, které byly vyfakturovány a dokončeny.',
      placement: 'top' as const,
    },
    {
      target: '[data-tour="client-help-button"]',
      content: 'Klikněte zde kdykoliv, abyste restartovali tuto prohlídku nebo si vybrali jazyk.',
      placement: 'left' as const,
    },
    {
      target: 'body',
      content: 'Vše je připraveno! Začněte procházením katalogu nebo vytvořením vaší první objednávky.',
      placement: 'center' as const,
    },
  ],
};
