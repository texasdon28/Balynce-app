// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Transaction {
  date: string;
  description: string;
  amount: string;
  category?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  plan: 'free' | 'single' | 'monthly' | 'unlimited';
  parsesUsed: number;
  parsesRemaining: number;
  subscriptionEnd?: Date;
  stripeCustomerId?: string;
}

type Language = 'en' | 'es';

interface PricingPlan {
  id: string;
  name: string;
  nameEs: string;
  price: number;
  type: 'one-time' | 'monthly';
  parses: number | 'unlimited';
  insights: boolean;
  popular?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'single',
    name: 'Single Parse',
    nameEs: 'Análisis Único',
    price: 3,
    type: 'one-time',
    parses: 1,
    insights: false
  },
  {
    id: 'monthly',
    name: 'Monthly Plan',
    nameEs: 'Plan Mensual',
    price: 9,
    type: 'monthly',
    parses: 5,
    insights: true,
    popular: true
  },
  {
    id: 'unlimited',
    name: 'Unlimited Plan',
    nameEs: 'Plan Ilimitado',
    price: 25,
    type: 'monthly',
    parses: 'unlimited',
    insights: true
  }
];

const translations = {
  en: {
    signIn: 'Sign in with Google',
    signOut: 'Sign Out',
    upgrade: 'Upgrade Plan',
    language: 'Language',
    title: 'Transform Your Bank Statements Into Actionable Data',
    subtitle: 'Upload PDFs. Extract transactions. Categorize with AI. Get Smart Insights.',
    uploadTitle: 'Upload Bank Statement (PDF)',
    selectFile: 'Select PDF File',
    uploadAnother: 'Upload Another PDF',
    choosePlan: 'Choose Your Plan',
    oneTime: 'One-time',
    monthly: 'Monthly',
    popular: 'Most Popular',
    parse: 'parse',
    parses: 'parses',
    unlimited: 'Unlimited',
    buyNow: 'Buy Now',
    subscribe: 'Subscribe',
    currentPlan: 'Current Plan',
    parsesLeft: 'parses remaining',
    basicParsing: 'Basic PDF parsing',
    smartInsights: 'Smart spending insights',
    categoryAnalysis: 'Category analysis',
    exportOptions: 'Export options',
    prioritySupport: 'Priority support',
    totalSpent: 'Total Spent',
    totalIncome: 'Total Income',
    netAmount: 'Net Amount',
    transactions: 'Transactions',
    exportCsv: 'Export CSV',
    quickbooks: 'QuickBooks',
    needUpgrade: 'Upgrade to continue parsing',
    paymentSuccess: 'Payment successful! 🎉',
    paymentError: 'Payment failed. Please try again.',
    salary: 'Salary & Wages',
    transferIn: 'Transfer In',
    otherIncome: 'Other Income',
    fastFood: 'Fast Food',
    restaurants: 'Restaurants',
    coffee: 'Coffee & Cafes',
    foodDelivery: 'Food Delivery',
    gas: 'Gas & Fuel',
    autoPayment: 'Auto Payment',
    rideshare: 'Rideshare',
    movies: 'Movies & Theater',
    subscriptions: 'Subscriptions',
    onlineShopping: 'Online Shopping',
    generalShopping: 'General Shopping',
    clothing: 'Clothing & Fashion',
    technology: 'Technology',
    personalTransfers: 'Personal Transfers',
    generalExpenses: 'General Expenses'
  },
  es: {
    signIn: 'Iniciar sesión con Google',
    signOut: 'Cerrar Sesión',
    upgrade: 'Mejorar Plan',
    language: 'Idioma',
    title: 'Transforma tus Estados de Cuenta en Datos Útiles',
    subtitle: 'Sube PDFs. Extrae transacciones. Categoriza con IA. Obtén Insights Inteligentes.',
    uploadTitle: 'Subir Estado de Cuenta (PDF)',
    selectFile: 'Seleccionar Archivo PDF',
    uploadAnother: 'Subir Otro PDF',
    choosePlan: 'Elige tu Plan',
    oneTime: 'Una vez',
    monthly: 'Mensual',
    popular: 'Más Popular',
    parse: 'análisis',
    parses: 'análisis',
    unlimited: 'Ilimitado',
    buyNow: 'Comprar Ahora',
    subscribe: 'Suscribirse',
    currentPlan: 'Plan Actual',
    parsesLeft: 'análisis restantes',
    basicParsing: 'Análisis básico de PDF',
    smartInsights: 'Insights inteligentes de gastos',
    categoryAnalysis: 'Análisis de categorías',
    exportOptions: 'Opciones de exportación',
    prioritySupport: 'Soporte prioritario',
    totalSpent: 'Total Gastado',
    totalIncome: 'Ingresos Totales',
    netAmount: 'Cantidad Neta',
    transactions: 'Transacciones',
    exportCsv: 'Exportar CSV',
    quickbooks: 'QuickBooks',
    needUpgrade: 'Mejora tu plan para continuar',
    paymentSuccess: '¡Pago exitoso! 🎉',
    paymentError: 'Pago falló. Inténtalo de nuevo.',
    salary: 'Salario y Sueldos',
    transferIn: 'Transferencia Entrante',
    otherIncome: 'Otros Ingresos',
    fastFood: 'Comida Rápida',
    restaurants: 'Restaurantes',
    coffee: 'Café y Cafeterías',
    foodDelivery: 'Entrega de Comida',
    gas: 'Gasolina y Combustible',
    autoPayment: 'Pago de Auto',
    rideshare: 'Viajes Compartidos',
    movies: 'Películas y Teatro',
    subscriptions: 'Suscripciones',
    onlineShopping: 'Compras en Línea',
    generalShopping: 'Compras Generales',
    clothing: 'Ropa y Moda',
    technology: 'Tecnología',
    personalTransfers: 'Transferencias Personales',
    generalExpenses: 'Gastos Generales'
  }
};

const initializeStripe = () => {
  return {
    redirectToCheckout: async (sessionId: string) => {
      console.log('Redirecting to Stripe checkout:', sessionId);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('stripe-success', { 
          detail: { sessionId, planId: sessionId.split('-')[1] } 
        }));
      }, 2000);
    }
  };
};

const createCheckoutSession = async (planId: string, userId: string) => {
  const plan = pricingPlans.find(p => p.id === planId);
  console.log('Creating checkout session for:', plan);
  
  return {
    sessionId: `session-${planId}-${userId}-${Date.now()}`
  };
};

// Hook for screen size
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

const GoogleSignIn: React.FC<{ onSignIn: (user: User) => void; language: Language }> = ({ onSignIn, language }) => {
  const t = translations[language];
  const { width } = useScreenSize();
  const isMobile = width <= 768;
  
  const handleGoogleSignIn = () => {
    const mockUser: User = {
      id: '123',
      email: 'user@example.com',
      name: 'John Doe',
      profilePicture: 'https://via.placeholder.com/40',
      plan: 'free',
      parsesUsed: 0,
      parsesRemaining: 0
    };
    onSignIn(mockUser);
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: isMobile ? '0.8125rem' : '0.875rem',
        fontWeight: '600',
        color: '#374151',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
    >
      <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style={{ width: '18px', height: '18px' }} />
      <span style={{ display: isMobile && width <= 480 ? 'none' : 'inline' }}>{t.signIn}</span>
      {isMobile && width <= 480 && <span>Sign in</span>}
    </button>
  );
};

const UserProfile: React.FC<{ user: User; onSignOut: () => void; onUpgrade: () => void; language: Language }> = ({ user, onSignOut, onUpgrade, language }) => {
  const t = translations[language];
  const { width } = useScreenSize();
  const isMobile = width <= 768;
  
  const getPlanDisplay = () => {
    const plan = pricingPlans.find(p => p.id === user.plan);
    if (!plan) return user.plan;
    return language === 'es' ? plan.nameEs : plan.name;
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '0.5rem' : '1rem'
    }}>
      {!isMobile && (
        <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: '600', color: '#374151' }}>{getPlanDisplay()}</div>
          {user.plan !== 'unlimited' && (
            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              {user.parsesRemaining} {t.parsesLeft}
            </div>
          )}
        </div>
      )}

      {user.plan !== 'unlimited' && (
        <button
          onClick={onUpgrade}
          style={{
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
            textTransform: 'none',
            letterSpacing: '0.025em'
          }}
        >
          {isMobile ? 'Upgrade' : t.upgrade}
        </button>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img
          src={user.profilePicture || 'https://via.placeholder.com/40'}
          alt={user.name}
          style={{ 
            width: isMobile ? '32px' : '40px', 
            height: isMobile ? '32px' : '40px', 
            borderRadius: '50%', 
            border: '2px solid #e5e7eb' 
          }}
        />
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{user.name}</span>
            <button
              onClick={onSignOut}
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left'
              }}
            >
              {t.signOut}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PricingModal: React.FC<{ 
  user: User | null; 
  onClose: () => void; 
  onSelectPlan: (planId: string) => void; 
  language: Language 
}> = ({ user, onClose, onSelectPlan, language }) => {
  const t = translations[language];
  const { width } = useScreenSize();
  const isMobile = width <= 768;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? '1rem' : '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: isMobile ? '16px' : '24px',
        maxWidth: isMobile ? '100%' : '1000px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#f3f4f6',
            border: 'none',
            fontSize: '1.125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          ✕
        </button>

        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: isMobile ? '2rem 1rem 1.5rem' : '3rem 2rem 2rem',
          borderRadius: isMobile ? '16px 16px 0 0' : '24px 24px 0 0',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{ 
            fontSize: isMobile ? '1.875rem' : '2.5rem', 
            fontWeight: 'bold', 
            marginBottom: '0.5rem' 
          }}>
            {t.choosePlan}
          </h2>
          <p style={{ 
            fontSize: isMobile ? '1rem' : '1.125rem', 
            opacity: 0.9 
          }}>
            {language === 'es' 
              ? 'Elige el plan perfecto para tus necesidades'
              : 'Choose the perfect plan for your needs'
            }
          </p>
        </div>

        <div style={{ padding: isMobile ? '2rem 1rem' : '3rem 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: isMobile ? '1.5rem' : '2rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  border: plan.popular ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                  borderRadius: '20px',
                  padding: isMobile ? '1.5rem' : '2rem',
                  textAlign: 'center',
                  position: 'relative',
                  backgroundColor: 'white',
                  transition: 'all 0.3s',
                  transform: plan.popular && !isMobile ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: plan.popular 
                    ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '600'
                  }}>
                    {t.popular}
                  </div>
                )}

                <h3 style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  {language === 'es' ? plan.nameEs : plan.name}
                </h3>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{
                    fontSize: isMobile ? '2.5rem' : '3rem',
                    fontWeight: 'bold',
                    color: '#111827'
                  }}>
                    ${plan.price}
                  </span>
                  <span style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    color: '#6b7280',
                    marginLeft: '0.5rem'
                  }}>
                    {plan.type === 'monthly' ? `/${t.monthly.toLowerCase()}` : t.oneTime.toLowerCase()}
                  </span>
                </div>

                <div style={{
                  textAlign: 'left',
                  marginBottom: '2rem',
                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  color: '#374151'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                    <span>
                      {plan.parses === 'unlimited' 
                        ? t.unlimited 
                        : `${plan.parses} ${plan.parses === 1 ? t.parse : t.parses}`
                      } {language === 'es' ? 'por mes' : 'per month'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                    <span>{t.basicParsing}</span>
                  </div>
                  {plan.insights && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                        <span>{t.smartInsights}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                        <span>{t.categoryAnalysis}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                        <span>{t.exportOptions}</span>
                      </div>
                    </>
                  )}
                  {plan.id === 'unlimited' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                      <span>{t.prioritySupport}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={user?.plan === plan.id}
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.875rem 1.5rem' : '1rem 2rem',
                    backgroundColor: user?.plan === plan.id 
                      ? '#6b7280' 
                      : plan.popular 
                        ? '#3b82f6' 
                        : '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    cursor: user?.plan === plan.id ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {user?.plan === plan.id 
                    ? t.currentPlan
                    : plan.type === 'monthly' 
                      ? t.subscribe 
                      : t.buyNow
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LanguageToggle: React.FC<{ language: Language; onLanguageChange: (lang: Language) => void }> = ({ language, onLanguageChange }) => {
  const { width } = useScreenSize();
  const isMobile = width <= 768;
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '0.5rem' : '0.75rem',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease'
    }}>
      <span style={{ 
        fontSize: isMobile ? '1rem' : '1.25rem',
        filter: 'grayscale(0)',
        opacity: 0.8
      }}>🌐</span>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        style={{
          padding: isMobile ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
          border: 'none',
          borderRadius: '8px',
          fontSize: isMobile ? '0.8125rem' : '0.875rem',
          backgroundColor: 'white',
          fontWeight: '600',
          cursor: 'pointer',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          outline: 'none',
          minWidth: isMobile ? '80px' : '100px',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem'
        }}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
};

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  const { width } = useScreenSize();
  const isMobile = width <= 768;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#10b981', border: '#059669', icon: '🎉' },
    error: { bg: '#ef4444', border: '#dc2626', icon: '❌' },
    info: { bg: '#3b82f6', border: '#2563eb', icon: 'ℹ️' }
  };

  const config = colors[type];

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: isMobile ? '10px' : '20px',
      left: isMobile ? '10px' : 'auto',
      backgroundColor: config.bg,
      color: 'white',
      padding: isMobile ? '0.875rem 1rem' : '1rem 1.25rem',
      borderRadius: '12px',
      border: `2px solid ${config.border}`,
      zIndex: 1001,
      maxWidth: isMobile ? 'calc(100vw - 20px)' : '400px',
      fontSize: isMobile ? '0.8125rem' : '0.875rem',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    }}>
      <span style={{ fontSize: '1.25rem' }}>{config.icon}</span>
      <span>{message}</span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const { width } = useScreenSize();
  const isMobile = width <= 768;
  const isTablet = width <= 1024 && width > 768;

  const t = translations[language];

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleSignIn = (signedInUser: User) => {
    setUser(signedInUser);
    showToast(`Welcome, ${signedInUser.name}!`, 'success');
  };

  const handleSignOut = () => {
    setUser(null);
    setTransactions([]);
    showToast('Signed out successfully', 'info');
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) return;

    try {
      showToast('Redirecting to payment...', 'info');
      
      const { sessionId } = await createCheckoutSession(planId, user.id);
      const stripe = initializeStripe();
      await stripe.redirectToCheckout(sessionId);
      
    } catch (error) {
      showToast(t.paymentError, 'error');
    }
  };

  useEffect(() => {
    const handleStripeSuccess = (event: CustomEvent) => {
      const { planId } = event.detail;
      const plan = pricingPlans.find(p => p.id === planId);
      
      if (user && plan) {
        const updatedUser: User = {
          ...user,
          plan: planId as any,
          parsesRemaining: plan.parses === 'unlimited' ? 999999 : plan.parses as number,
          subscriptionEnd: plan.type === 'monthly' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined
        };
        setUser(updatedUser);
        setShowPricingModal(false);
        showToast(t.paymentSuccess, 'success');
      }
    };

    window.addEventListener('stripe-success', handleStripeSuccess as EventListener);
    return () => window.removeEventListener('stripe-success', handleStripeSuccess as EventListener);
  }, [user, t.paymentSuccess]);

  const canUpload = () => {
    if (!user) return false;
    if (user.plan === 'unlimited') return true;
    return user.parsesRemaining > 0;
  };

  const categorizeTransaction = (description: string, amount: string): string => {
    const desc = description.toLowerCase().trim();
    const isExpense = parseFloat(amount) < 0;
    
    if (!isExpense) {
      if (desc.includes('payroll') || desc.includes('salary') || desc.includes('employer')) {
        return language === 'es' ? t.salary : 'Salary & Wages';
      }
      if (desc.includes('transfer') || desc.includes('deposit')) {
        return language === 'es' ? t.transferIn : 'Transfer In';
      }
      return language === 'es' ? t.otherIncome : 'Other Income';
    }
    
    if (desc.includes('mcdonald') || desc.includes('burger king') || desc.includes('taco bell')) {
      return language === 'es' ? t.fastFood : 'Fast Food';
    }
    if (desc.includes('restaurant') || desc.includes('bistro') || desc.includes('grill')) {
      return language === 'es' ? t.restaurants : 'Restaurants';
    }
    if (desc.includes('starbucks') || desc.includes('coffee')) {
      return language === 'es' ? t.coffee : 'Coffee & Cafes';
    }
    if (desc.includes('gas') || desc.includes('fuel')) {
      return language === 'es' ? t.gas : 'Gas & Fuel';
    }
    
    return language === 'es' ? t.generalExpenses : 'General Expenses';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      showToast('Please sign in first', 'error');
      return;
    }

    if (!canUpload()) {
      setShowPricingModal(true);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large. Please use a PDF under 10MB.', 'error');
      return;
    }

    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file.', 'error');
      return;
    }

    setFileName(file.name);
    showToast(`Processing ${file.name}...`, 'info');
    setLoading(true);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typed = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await (window as any).pdfjsLib.getDocument({ data: typed }).promise;
          
          let allText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            const pageText = content.items
              .map((item: any) => item.str || '')
              .filter((text: string) => text.length > 0)
              .join(' ');
            
            allText += '\n' + pageText;
          }

          const lines = allText.split(/[\n\r]+/).filter(line => line.trim().length > 10);
          const transactionLines = lines.filter(line => {
            const hasDate = /\d{2}\/\d{2}/.test(line);
            const hasAmount = /\d+\.\d{2}/.test(line);
            const notHeader = !line.includes('Balance') && !line.includes('TOTAL');
            return hasDate && hasAmount && notHeader;
          });
          
          let parsed: Transaction[] = [];
          
          if (transactionLines.length > 0) {
            parsed = transactionLines.map((line, index) => {
              const dateMatch = line.match(/(\d{2}\/\d{2})/);
              const amountMatches = line.match(/-?\d{1,3}(?:,\d{3})*\.\d{2}/g);
              const lastAmount = amountMatches ? amountMatches[amountMatches.length - 1] : '0.00';
              
              let description = line;
              if (dateMatch) {
                description = description.replace(dateMatch[0], '').trim();
              }
              if (amountMatches) {
                amountMatches.forEach(amt => {
                  description = description.replace(amt, '').trim();
                });
              }
              
              description = description.replace(/\s+/g, ' ').substring(0, 50);
              
              return {
                date: dateMatch ? dateMatch[1] : `${String(index + 1).padStart(2, '0')}/01`,
                description: description || `Transaction ${index + 1}`,
                amount: lastAmount.replace(/,/g, ''),
                category: categorizeTransaction(description, lastAmount)
              };
            });
          }

          if (parsed.length === 0) {
            showToast('No transactions found. Please check if this is a valid bank statement PDF.', 'error');
            return;
          }

          const validTransactions = parsed.filter(t => 
            t.amount !== '0.00' && 
            t.description.length > 0 && 
            !isNaN(parseFloat(t.amount))
          );

          const updatedUser: User = {
            ...user,
            parsesUsed: user.parsesUsed + 1,
            parsesRemaining: user.plan === 'unlimited' ? 999999 : Math.max(0, user.parsesRemaining - 1)
          };
          setUser(updatedUser);

          setTransactions(validTransactions);
          showToast(`Successfully extracted ${validTransactions.length} transactions!`, 'success');
          
        } catch (error) {
          showToast(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        showToast('Failed to read file', 'error');
        setLoading(false);
      };
      
      reader.readAsArrayBuffer(file);
    };
    
    script.onerror = () => {
      showToast('Failed to load PDF processing library', 'error');
      setLoading(false);
    };
    
    document.head.appendChild(script);
  };

  const totalSpent = transactions
    .filter(t => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const totalIncome = transactions
    .filter(t => parseFloat(t.amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const netAmount = totalIncome - totalSpent;

  // Add global styles for full width
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html, body {
        width: 100%;
        height: 100%;
        overflow-x: hidden;
      }
      
      #root {
        width: 100%;
        min-height: 100vh;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: '100%',
      margin: 0,
      padding: 0,
      overflowX: 'hidden'
    }}>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {showPricingModal && (
        <PricingModal 
          user={user}
          onClose={() => setShowPricingModal(false)}
          onSelectPlan={handleSelectPlan}
          language={language}
        />
      )}

      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: isMobile ? '1rem' : '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: isMobile ? '70px' : '90px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        width: '100%',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
          <div style={{
            width: isMobile ? '40px' : '50px',
            height: isMobile ? '40px' : '50px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            B
          </div>
          <span style={{ 
            fontSize: isMobile ? '1.5rem' : '2rem', 
            fontWeight: 'bold', 
            color: '#111827' 
          }}>
            Balynce
          </span>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.75rem' : '1.5rem',
          flexWrap: 'wrap'
        }}>
          <LanguageToggle language={language} onLanguageChange={setLanguage} />
          
          {user ? (
            <UserProfile 
              user={user} 
              onSignOut={handleSignOut} 
              onUpgrade={() => setShowPricingModal(true)} 
              language={language}
            />
          ) : (
            <GoogleSignIn onSignIn={handleSignIn} language={language} />
          )}
        </div>
      </header>

      <main style={{ 
        width: '100%',
        padding: isMobile ? '1.5rem 1rem' : isTablet ? '2rem 1.5rem' : '3rem 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: `calc(100vh - ${isMobile ? '70px' : '90px'})`,
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          textAlign: 'center', 
          paddingTop: isMobile ? '1rem' : '2rem', 
          marginBottom: isMobile ? '2rem' : '3rem' 
        }}>
          <h1 style={{
            fontSize: isMobile ? '2rem' : isTablet ? '3rem' : '4rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            marginBottom: '1.5rem',
            lineHeight: '1.1'
          }}>
            {t.title}
          </h1>
          <p style={{
            fontSize: isMobile ? '1rem' : isTablet ? '1.25rem' : '1.5rem',
            color: '#6b7280',
            marginBottom: isMobile ? '2rem' : '3rem',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: '1.6',
            padding: isMobile ? '0 1rem' : '0'
          }}>
            {t.subtitle}
          </p>
        </div>

        {user && user.plan !== 'unlimited' && (
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            padding: isMobile ? '1rem' : '1.5rem 2rem',
            marginBottom: isMobile ? '2rem' : '3rem',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: isMobile ? '40px' : '50px',
                height: isMobile ? '40px' : '50px',
                backgroundColor: user.parsesRemaining > 0 ? '#d1fae5' : '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.25rem' : '1.5rem'
              }}>
                {user.parsesRemaining > 0 ? '📊' : '⚠️'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ 
                  fontSize: isMobile ? '1rem' : '1.25rem', 
                  fontWeight: '600', 
                  color: '#111827' 
                }}>
                  {user.parsesRemaining} {t.parsesLeft}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {language === 'es' ? 'Plan actual:' : 'Current plan:'} {pricingPlans.find(p => p.id === user.plan)?.[language === 'es' ? 'nameEs' : 'name']}
                </div>
              </div>
            </div>
            
            {user.parsesRemaining === 0 && (
              <button
                onClick={() => setShowPricingModal(true)}
                style={{
                  padding: isMobile ? '1rem 2rem' : '1.25rem 2.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: isMobile ? '0.875rem' : '1.125rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 16px -4px rgba(102, 126, 234, 0.4)',
                  textTransform: 'none',
                  letterSpacing: '0.025em',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                {t.upgrade}
              </button>
            )}
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '2rem 1.5rem' : isTablet ? '3rem 2rem' : '4rem',
          borderRadius: isMobile ? '16px' : '24px',
          border: user && canUpload() ? '2px dashed #3b82f6' : '2px dashed #e5e7eb',
          textAlign: 'center',
          marginBottom: isMobile ? '2rem' : '4rem',
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: isMobile ? '60px' : '80px',
            height: isMobile ? '60px' : '80px',
            backgroundColor: loading ? '#f59e0b' : user && canUpload() ? '#dbeafe' : '#f3f4f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
            fontSize: isMobile ? '1.5rem' : '2rem'
          }}>
            {loading ? '⏳' : user && canUpload() ? '⬆️' : '🔒'}
          </div>

          <h3 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            {fileName || t.uploadTitle}
          </h3>

          <p style={{
            color: '#6b7280',
            fontSize: isMobile ? '1rem' : '1.125rem',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem',
            lineHeight: '1.5'
          }}>
            {!user 
              ? (language === 'es' ? 'Inicia sesión para comenzar a analizar tus estados de cuenta' : 'Sign in to start analyzing your bank statements')
              : !canUpload()
              ? t.needUpgrade
              : (language === 'es' ? 'Arrastra y suelta tu archivo PDF aquí o haz clic para seleccionar' : 'Drag and drop your PDF file here or click to select')
            }
          </p>

          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload"
            disabled={loading || !user || !canUpload()}
          />

          <label
            htmlFor="file-upload"
            style={{
              display: 'inline-block',
              padding: isMobile ? '1.25rem 2rem' : '1.5rem 3rem',
              background: !user || !canUpload() 
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                : loading 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              borderRadius: isMobile ? '16px' : '20px',
              cursor: !user || !canUpload() || loading ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? '1rem' : '1.25rem',
              fontWeight: '700',
              marginBottom: '1.5rem',
              boxShadow: !user || !canUpload() 
                ? '0 4px 6px -1px rgba(156, 163, 175, 0.3)' 
                : loading 
                  ? '0 8px 16px -4px rgba(245, 158, 11, 0.4)' 
                  : '0 8px 16px -4px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s ease',
              border: 'none',
              textTransform: 'none',
              letterSpacing: '0.025em',
              position: 'relative',
              overflow: 'hidden',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            {!user ? t.signIn : !canUpload() ? t.upgrade : (fileName ? t.uploadAnother : t.selectFile)}
          </label>
        </div>

        {transactions.length > 0 && user && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: isMobile ? '1.5rem' : '2rem',
              marginBottom: isMobile ? '2rem' : '3rem',
              width: '100%'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: isMobile ? '1.5rem' : '2rem',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {t.totalSpent}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? '2rem' : '2.5rem', 
                    fontWeight: 'bold', 
                    color: '#dc2626' 
                  }}>
                    ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  width: isMobile ? '56px' : '64px',
                  height: isMobile ? '56px' : '64px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1.75rem' : '2rem'
                }}>
                  💸
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: isMobile ? '1.5rem' : '2rem',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {t.totalIncome}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? '2rem' : '2.5rem', 
                    fontWeight: 'bold', 
                    color: '#059669' 
                  }}>
                    ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  width: isMobile ? '56px' : '64px',
                  height: isMobile ? '56px' : '64px',
                  backgroundColor: '#d1fae5',
                  color: '#059669',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1.75rem' : '2rem'
                }}>
                  💰
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: isMobile ? '1.5rem' : '2rem',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                gridColumn: isMobile ? '1' : isTablet ? '1 / -1' : 'auto'
              }}>
                <div>
                  <div style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {t.netAmount}
                  </div>
                  <div style={{
                    fontSize: isMobile ? '2rem' : '2.5rem',
                    fontWeight: 'bold',
                    color: netAmount >= 0 ? '#059669' : '#dc2626'
                  }}>
                    {netAmount >= 0 ? '+' : ''}${Math.abs(netAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  width: isMobile ? '56px' : '64px',
                  height: isMobile ? '56px' : '64px',
                  backgroundColor: netAmount >= 0 ? '#d1fae5' : '#fee2e2',
                  color: netAmount >= 0 ? '#059669' : '#dc2626',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1.75rem' : '2rem'
                }}>
                  {netAmount >= 0 ? '📈' : '📉'}
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '16px' : '24px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                padding: isMobile ? '1.5rem' : '2rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '1rem' : '0'
              }}>
                <h3 style={{ 
                  fontSize: isMobile ? '1.25rem' : '1.5rem', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  📋 {t.transactions} ({transactions.length})
                </h3>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <button
                    onClick={() => {
                      const csv = [
                        'Date,Description,Amount,Category',
                        ...transactions.map(t => `${t.date},"${t.description}",${t.amount},${t.category || 'Uncategorized'}`)
                      ].join('\n');
                      
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${fileName?.replace('.pdf', '') || 'transactions'}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast('CSV exported!', 'success');
                    }}
                    style={{
                      padding: isMobile ? '0.75rem 1.25rem' : '0.875rem 1.75rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                      textTransform: 'none',
                      letterSpacing: '0.025em',
                      flex: isMobile ? '1' : 'none'
                    }}
                  >
                    📄 {isMobile ? 'CSV' : t.exportCsv}
                  </button>
                </div>
              </div>

              <div style={{ 
                maxHeight: isMobile ? '400px' : '500px', 
                overflowY: 'auto',
                overflowX: isMobile ? 'auto' : 'visible'
              }}>
                <table style={{
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: isMobile ? '600px' : 'auto'
                }}>
                  <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{
                        padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                        textAlign: 'left',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: isMobile ? '80px' : 'auto'
                      }}>
                        {language === 'es' ? 'Fecha' : 'Date'}
                      </th>
                      <th style={{
                        padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                        textAlign: 'left',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: isMobile ? '200px' : 'auto'
                      }}>
                        {language === 'es' ? 'Descripción' : 'Description'}
                      </th>
                      <th style={{
                        padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                        textAlign: 'right',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: isMobile ? '100px' : 'auto'
                      }}>
                        {language === 'es' ? 'Cantidad' : 'Amount'}
                      </th>
                      <th style={{
                        padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                        textAlign: 'left',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: isMobile ? '120px' : 'auto'
                      }}>
                        {language === 'es' ? 'Categoría' : 'Category'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <td style={{
                          padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          color: '#374151',
                          fontWeight: '500'
                        }}>
                          {transaction.date}
                        </td>
                        <td style={{
                          padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          color: '#374151',
                          maxWidth: isMobile ? '200px' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: isMobile ? 'nowrap' : 'normal'
                        }}>
                          {transaction.description}
                        </td>
                        <td style={{
                          padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          textAlign: 'right',
                          color: parseFloat(transaction.amount) < 0 ? '#dc2626' : '#059669',
                          fontWeight: '600'
                        }}>
                          {parseFloat(transaction.amount) < 0 ? '-' : '+'}${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                        </td>
                        <td style={{
                          padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          color: '#6b7280'
                        }}>
                          <span style={{
                            padding: isMobile ? '0.25rem 0.5rem' : '0.375rem 0.75rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '20px',
                            fontSize: isMobile ? '0.6875rem' : '0.75rem',
                            fontWeight: '500',
                            display: 'inline-block',
                            maxWidth: isMobile ? '100px' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {transaction.category || 'Uncategorized'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '2rem 1.5rem' : '4rem',
            borderRadius: isMobile ? '16px' : '24px',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            marginBottom: isMobile ? '2rem' : '3rem'
          }}>
            <div style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: '2rem' }}>🏦</div>
            <h2 style={{ 
              fontSize: isMobile ? '2rem' : '2.5rem', 
              fontWeight: 'bold', 
              color: '#111827', 
              marginBottom: '1.5rem' 
            }}>
              {language === 'es' ? 'Bienvenido a Balynce' : 'Welcome to Balynce'}
            </h2>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '3rem', 
              maxWidth: '700px', 
              margin: '0 auto 3rem',
              fontSize: isMobile ? '1rem' : '1.25rem',
              lineHeight: '1.6'
            }}>
              {language === 'es' 
                ? 'Analiza tus estados de cuenta bancarios con IA. Obtén insights inteligentes sobre tus gastos y toma mejores decisiones financieras.'
                : 'Analyze your bank statements with AI. Get smart insights about your spending and make better financial decisions.'
              }
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: isMobile ? '2rem' : '3rem', 
              marginTop: '3rem',
              maxWidth: '1000px',
              margin: '3rem auto 0'
            }}>
              <div style={{ 
                textAlign: 'center',
                padding: isMobile ? '1.5rem' : '2rem',
                backgroundColor: '#f8fafc',
                borderRadius: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', marginBottom: '1rem' }}>🤖</div>
                <h3 style={{ 
                  fontSize: isMobile ? '1.25rem' : '1.5rem', 
                  fontWeight: 'bold', 
                  marginBottom: '1rem', 
                  color: '#111827' 
                }}>
                  {language === 'es' ? 'IA Avanzada' : 'Advanced AI'}
                </h3>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: isMobile ? '0.875rem' : '1rem', 
                  lineHeight: '1.6' 
                }}>
                  {language === 'es' 
                    ? 'Categorización automática y detección inteligente de patrones de gasto'
                    : 'Automatic categorization and intelligent spending pattern detection'
                  }
                </p>
              </div>
              
              <div style={{ 
                textAlign: 'center',
                padding: isMobile ? '1.5rem' : '2rem',
                backgroundColor: '#f8fafc',
                borderRadius: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ 
                  fontSize: isMobile ? '1.25rem' : '1.5rem', 
                  fontWeight: 'bold', 
                  marginBottom: '1rem', 
                  color: '#111827' 
                }}>
                  {language === 'es' ? 'Análisis Detallado' : 'Detailed Analysis'}
                </h3>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: isMobile ? '0.875rem' : '1rem', 
                  lineHeight: '1.6' 
                }}>
                  {language === 'es' 
                    ? 'Visualiza tus gastos e ingresos con categorías automáticas y exportaciones'
                    : 'Visualize your spending and income with automatic categories and exports'
                  }
                </p>
              </div>
              
              <div style={{ 
                textAlign: 'center',
                padding: isMobile ? '1.5rem' : '2rem',
                backgroundColor: '#f8fafc',
                borderRadius: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', marginBottom: '1rem' }}>🔒</div>
                <h3 style={{ 
                  fontSize: isMobile ? '1.25rem' : '1.5rem', 
                  fontWeight: 'bold', 
                  marginBottom: '1rem', 
                  color: '#111827' 
                }}>
                  {language === 'es' ? 'Seguro y Privado' : 'Secure & Private'}
                </h3>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: isMobile ? '0.875rem' : '1rem', 
                  lineHeight: '1.6' 
                }}>
                  {language === 'es' 
                    ? 'Tus datos se procesan localmente y nunca se almacenan en nuestros servidores'
                    : 'Your data is processed locally and never stored on our servers'
                  }
                </p>
              </div>
            </div>

            <div style={{ marginTop: isMobile ? '3rem' : '4rem' }}>
              <button
                onClick={() => setShowPricingModal(true)}
                style={{
                  padding: isMobile ? '1.5rem 2.5rem' : '1.75rem 3.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: isMobile ? '16px' : '20px',
                  fontSize: isMobile ? '1.125rem' : '1.375rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 12px 24px -6px rgba(102, 126, 234, 0.4)',
                  marginBottom: '1rem',
                  textTransform: 'none',
                  letterSpacing: '0.025em',
                  position: 'relative',
                  overflow: 'hidden',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                {language === 'es' ? 'Ver Planes y Precios' : 'View Plans & Pricing'}
              </button>
              <p style={{ 
                fontSize: isMobile ? '0.8125rem' : '0.875rem', 
                color: '#9ca3af', 
                marginTop: '1rem' 
              }}>
                {language === 'es' 
                  ? 'Desde $3 por análisis único • Sin compromisos'
                  : 'Starting at $3 per single parse • No commitments'
                }
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
