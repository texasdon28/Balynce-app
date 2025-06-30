import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
interface Transaction {
  date: string;
  description: string;
  amount: string;
  category?: string;
}

// Smart Insights Engine Types
interface SpendingInsight {
  id: string;
  type: 'comparison' | 'budget' | 'alert';
  category: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  data: {
    currentAmount: number;
    previousAmount?: number;
    changePercent?: number;
    suggestedBudget?: number;
    threshold?: number;
  };
  actionable: boolean;
  timestamp: Date;
}

interface MonthlySpending {
  [category: string]: number;
}

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#10b981', border: '#059669' },
    error: { bg: '#ef4444', border: '#dc2626' },
    info: { bg: '#3b82f6', border: '#2563eb' }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: colors[type].bg,
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      border: `2px solid ${colors[type].border}`,
      zIndex: 1000,
      maxWidth: '300px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      {message}
    </div>
  );
};

// Smart Insights Engine Class
class SmartInsightsEngine {
  private transactions: Transaction[];
  private insights: SpendingInsight[] = [];

  constructor(transactions: Transaction[]) {
    this.transactions = transactions;
  }

  generateInsights(): SpendingInsight[] {
    this.insights = [];
    this.generateSpendingComparisons();
    this.generateBudgetRecommendations();
    this.generateUnusualSpendingAlerts();
    
    return this.insights.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  private generateSpendingComparisons(): void {
    const currentMonth = this.getCurrentMonthSpending();
    const previousMonth = this.getPreviousMonthSpending();

    Object.keys(currentMonth).forEach(category => {
      const currentAmount = currentMonth[category];
      const previousAmount = previousMonth[category] || 0;
      
      if (previousAmount > 0) {
        const changePercent = ((currentAmount - previousAmount) / previousAmount) * 100;
        
        if (Math.abs(changePercent) >= 15) {
          const severity = Math.abs(changePercent) >= 50 ? 'warning' : 'info';
          const direction = changePercent > 0 ? 'more' : 'less';
          
          this.insights.push({
            id: `comparison_${category}_${Date.now()}`,
            type: 'comparison',
            category,
            message: `You spent ${Math.abs(changePercent).toFixed(0)}% ${direction} on ${category} this month ($${currentAmount.toFixed(2)} vs $${previousAmount.toFixed(2)})`,
            severity,
            data: { currentAmount, previousAmount, changePercent },
            actionable: changePercent > 0,
            timestamp: new Date()
          });
        }
      }
    });
  }

  private generateBudgetRecommendations(): void {
    const last3MonthsSpending = this.getLast3MonthsSpending();
    
    Object.keys(last3MonthsSpending).forEach(category => {
      const monthlyAmounts = last3MonthsSpending[category];
      if (monthlyAmounts.length >= 2) {
        const avgSpending = monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length;
        const maxSpending = Math.max(...monthlyAmounts);
        const minSpending = Math.min(...monthlyAmounts);
        const suggestedBudget = avgSpending * 1.2;
        
        if ((maxSpending - minSpending) / avgSpending > 0.3) {
          this.insights.push({
            id: `budget_${category}_${Date.now()}`,
            type: 'budget',
            category,
            message: `Based on your ${category} spending pattern, consider setting a monthly budget of $${suggestedBudget.toFixed(2)} (your average is $${avgSpending.toFixed(2)})`,
            severity: 'info',
            data: { currentAmount: avgSpending, suggestedBudget },
            actionable: true,
            timestamp: new Date()
          });
        }
      }
    });
  }

  private generateUnusualSpendingAlerts(): void {
    const currentMonth = this.getCurrentMonthSpending();
    const historicalAverages = this.getHistoricalAverages();
    
    Object.keys(currentMonth).forEach(category => {
      const currentAmount = currentMonth[category];
      const historicalAvg = historicalAverages[category];
      
      if (historicalAvg && currentAmount > historicalAvg * 2) {
        this.insights.push({
          id: `alert_${category}_${Date.now()}`,
          type: 'alert',
          category,
          message: `⚠️ Unusual spending detected: Your ${category} spending this month ($${currentAmount.toFixed(2)}) is significantly higher than your typical $${historicalAvg.toFixed(2)}`,
          severity: 'warning',
          data: { currentAmount, previousAmount: historicalAvg, threshold: historicalAvg * 2 },
          actionable: true,
          timestamp: new Date()
        });
      }
    });

    this.detectLargeTransactions();
  }

  private detectLargeTransactions(): void {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    this.transactions
      .filter(t => {
        const tDate = new Date(t.date + '/2024');
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      })
      .forEach(transaction => {
        const categoryTransactions = this.transactions.filter(t => t.category === transaction.category);
        const categoryAverage = categoryTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) / categoryTransactions.length;
        
        if (Math.abs(parseFloat(transaction.amount)) > categoryAverage * 3) {
          this.insights.push({
            id: `large_transaction_${Date.now()}`,
            type: 'alert',
            category: transaction.category || 'General',
            message: `💰 Large ${transaction.category} transaction: $${Math.abs(parseFloat(transaction.amount)).toFixed(2)} - "${transaction.description}"`,
            severity: Math.abs(parseFloat(transaction.amount)) > categoryAverage * 5 ? 'warning' : 'info',
            data: { currentAmount: Math.abs(parseFloat(transaction.amount)), previousAmount: categoryAverage, threshold: categoryAverage * 3 },
            actionable: false,
            timestamp: new Date()
          });
        }
      });
  }

  private getCurrentMonthSpending(): MonthlySpending {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return this.getSpendingForMonth(currentMonth, currentYear);
  }

  private getPreviousMonthSpending(): MonthlySpending {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return this.getSpendingForMonth(lastMonth.getMonth(), lastMonth.getFullYear());
  }

  private getLast3MonthsSpending(): { [category: string]: number[] } {
    const result: { [category: string]: number[] } = {};
    
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthSpending = this.getSpendingForMonth(date.getMonth(), date.getFullYear());
      
      Object.keys(monthSpending).forEach(category => {
        if (!result[category]) result[category] = [];
        result[category].push(monthSpending[category]);
      });
    }
    
    return result;
  }

  private getHistoricalAverages(): MonthlySpending {
    const categoryTotals: { [category: string]: { total: number; months: Set<string> } } = {};
    
    this.transactions.forEach(transaction => {
      const monthKey = `2024-${transaction.date.split('/')[0]}`;
      
      if (!categoryTotals[transaction.category || 'General']) {
        categoryTotals[transaction.category || 'General'] = { total: 0, months: new Set() };
      }
      
      categoryTotals[transaction.category || 'General'].total += Math.abs(parseFloat(transaction.amount));
      categoryTotals[transaction.category || 'General'].months.add(monthKey);
    });
    
    const averages: MonthlySpending = {};
    Object.keys(categoryTotals).forEach(category => {
      const { total, months } = categoryTotals[category];
      averages[category] = total / months.size;
    });
    
    return averages;
  }

  private getSpendingForMonth(month: number, year: number): MonthlySpending {
    const spending: MonthlySpending = {};
    
    this.transactions
      .filter(transaction => {
        const tMonth = parseInt(transaction.date.split('/')[0]) - 1;
        return tMonth === month && parseFloat(transaction.amount) < 0;
      })
      .forEach(transaction => {
        const category = transaction.category || 'General';
        if (!spending[category]) spending[category] = 0;
        spending[category] += Math.abs(parseFloat(transaction.amount));
      });
    
    return spending;
  }
}

// Smart Insights Panel Component
const InsightsPanel: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  
  useEffect(() => {
    if (transactions.length > 0) {
      const engine = new SmartInsightsEngine(transactions);
      const generatedInsights = engine.generateInsights();
      setInsights(generatedInsights);
    }
  }, [transactions]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '💡';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { borderColor: '#dc2626', backgroundColor: '#fef2f2' };
      case 'warning': return { borderColor: '#f59e0b', backgroundColor: '#fffbeb' };
      case 'info': return { borderColor: '#3b82f6', backgroundColor: '#eff6ff' };
      default: return { borderColor: '#6b7280', backgroundColor: '#f9fafb' };
    }
  };

  if (insights.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🧠</div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
          Smart Insights Engine
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Upload more transactions to see personalized spending insights and recommendations!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      marginBottom: '2rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🧠 Smart Insights
        <span style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          fontSize: '0.75rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '12px',
          fontWeight: '500'
        }}>
          {insights.length}
        </span>
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {insights.map((insight) => {
          const colors = getSeverityColor(insight.severity);
          return (
            <div
              key={insight.id}
              style={{
                padding: '1.25rem',
                borderRadius: '8px',
                borderLeft: `4px solid ${colors.borderColor}`,
                backgroundColor: colors.backgroundColor,
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{getSeverityIcon(insight.severity)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {insight.type} • {insight.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {insight.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    {insight.message}
                  </p>
                  
                  {insight.actionable && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}>
                        Set Budget
                      </button>
                      <button style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}>
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // Advanced AI-Powered Smart Categorization Engine
  const categorizeTransaction = (description: string, amount: string): string => {
    const desc = description.toLowerCase().trim();
    const isExpense = parseFloat(amount) < 0;
    const amountValue = Math.abs(parseFloat(amount));
    
    if (!isExpense) {
      if (desc.includes('payroll') || desc.includes('salary') || desc.includes('trilyon') || desc.includes('employer')) {
        return 'Salary & Wages';
      }
      if (desc.includes('cash app') || desc.includes('venmo') || desc.includes('transfer') || desc.includes('deposit')) {
        return 'Transfer In';
      }
      return 'Other Income';
    }
    
    // Food & Dining
    if (desc.includes('mcdonald') || desc.includes('burger king') || desc.includes('taco bell')) {
      return 'Fast Food';
    }
    if (desc.includes('restaurant') || desc.includes('bistro') || desc.includes('grill')) {
      return 'Restaurants';
    }
    if (desc.includes('starbucks') || desc.includes('coffee') || desc.includes('cafe')) {
      return 'Coffee & Cafes';
    }
    if (desc.includes('doordash') || desc.includes('uber eats') || desc.includes('grubhub')) {
      return 'Food Delivery';
    }
    
    // Transportation
    if (desc.includes('shell') || desc.includes('exxon') || desc.includes('gas') || desc.includes('fuel')) {
      return 'Gas & Fuel';
    }
    if (desc.includes('audi') || desc.includes('auto') || desc.includes('car payment')) {
      return 'Auto Payment';
    }
    if (desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi')) {
      return 'Rideshare';
    }
    
    // Entertainment
    if (desc.includes('amc') || desc.includes('cinema') || desc.includes('movie')) {
      return 'Movies & Theater';
    }
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription')) {
      return 'Subscriptions';
    }
    
    // Shopping
    if (desc.includes('amazon') && amountValue < 25) {
      return 'Online Shopping';
    }
    if (desc.includes('target') || desc.includes('walmart')) {
      return 'General Shopping';
    }
    if (desc.includes('foot locker') || desc.includes('clothing')) {
      return 'Clothing & Fashion';
    }
    
    // Technology
    if (desc.includes('apple') || desc.includes('app store')) {
      return 'Technology';
    }
    
    // Personal Transfers
    if (desc.includes('cash app') || desc.includes('venmo') || desc.includes('payment sent')) {
      return 'Personal Transfers';
    }
    
    return 'General Expenses';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('🔄 File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large. Please use a PDF under 10MB.', 'error');
      return;
    }

    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file.', 'error');
      return;
    }

    setFileName(file.name);
    showToast(`🔄 Processing ${file.name}...`, 'info');
    setLoading(true);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      console.log('📚 PDF.js library loaded successfully');
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          console.log('📄 File read successfully, processing PDF...');
          const typed = new Uint8Array(reader.result as ArrayBuffer);
          console.log('💾 PDF data size:', typed.length, 'bytes');
          
          const pdf = await (window as any).pdfjsLib.getDocument({ data: typed }).promise;
          console.log('📖 PDF loaded successfully -', pdf.numPages, 'pages found');
          
          let allText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            console.log(`📑 Processing page ${i}/${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            const pageText = content.items
              .map((item: any) => {
                if ('str' in item && item.str.trim()) {
                  return item.str.trim();
                }
                return '';
              })
              .filter(text => text.length > 0)
              .join(' ');
            
            allText += '\n' + pageText;
          }

          console.log('📝 Total extracted text length:', allText.length, 'characters');
          
          // Multi-Bank PDF Processing Engine
          console.log('🏦 Detecting bank format...');
          
          const bankDetection = {
            chase: /chase|jpmorgan/i.test(allText),
            wellsFargo: /wells fargo|wf/i.test(allText),
            bankOfAmerica: /bank of america|boa/i.test(allText),
            citi: /citibank|citi/i.test(allText),
            usBank: /u\.?s\.?\s*bank/i.test(allText),
            capital: /capital one/i.test(allText)
          };
          
          const detectedBank = Object.entries(bankDetection).find(([bank, detected]) => detected)?.[0] || 'generic';
          console.log(`🎯 Detected bank format: ${detectedBank}`);
          showToast(`🏦 Detected ${detectedBank} format`, 'info');

          let parsed: Transaction[] = [];

          // Bank-specific patterns
          const bankSpecificPatterns = {
            chase: [
              /(\d{2}\/\d{2})\s+.*?\s+(\d{2}\/\d{2})\s+([^-+\d]*?)\s+[\d\-\(\)]+\s+[A-Z]{2}\s+.*?(-?\d{1,3}(?:,\d{3})*\.\d{2})\s+[\d,]+\.\d{2}/g,
              /(\d{2}\/\d{2})\s+([^-+\d]*?[^-+\d\s])\s+(-?\d{1,3}(?:,\d{3})*\.\d{2})/g,
              /(\d{2}\/\d{2})\s+(?:Card Purchase|Payment|Deposit|Transfer|Withdrawal)\s+\d{2}\/\d{2}\s+([^-+\d]*?)\s+(-?\d{1,3}(?:,\d{3})*\.\d{2})/g
            ],
            generic: [
              /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+([^-+\d]*?)\s+(-?\d{1,3}(?:,\d{3})*\.\d{2})/g,
              /(\d{1,2}\/\d{1,2})\s+.*?(-?\d{1,3}(?:,\d{3})*\.\d{2})/g
            ]
          };

          const patternsToTry = bankSpecificPatterns[detectedBank] || bankSpecificPatterns.generic;
          console.log(`🎯 Trying ${patternsToTry.length} ${detectedBank}-specific patterns...`);

          for (let i = 0; i < patternsToTry.length; i++) {
            const pattern = patternsToTry[i];
            console.log(`🔄 Testing ${detectedBank} pattern ${i + 1}...`);
            const matches = [...allText.matchAll(pattern)];
            console.log(`📊 Pattern ${i + 1} found ${matches.length} matches`);
            
            if (matches.length > 0) {
              console.log(`✅ ${detectedBank} pattern ${i + 1} matched! Found ${matches.length} transactions`);
              
              parsed = matches.map((match, index) => {
                let date = match[1];
                let description = '';
                let amount = '';
                
                if (match.length === 4) {
                  description = match[2];
                  amount = match[3];
                } else if (match.length === 3) {
                  description = match[0].replace(match[1], '').replace(match[2], '').trim();
                  amount = match[2];
                } else {
                  description = `Transaction ${index + 1}`;
                  amount = match[match.length - 1];
                }
                
                if (date && date.length > 5) {
                  date = date.substring(0, 5);
                }
                
                description = description.trim().replace(/\s+/g, ' ').substring(0, 50);
                if (!description || description.length < 2) {
                  description = `${detectedBank} Transaction ${index + 1}`;
                }
                
                amount = amount.replace(/[$,]/g, '');
                
                return {
                  date: date || `${String(index + 1).padStart(2, '0')}/01`,
                  description,
                  amount,
                  category: categorizeTransaction(description, amount)
                };
              });
              
              console.log(`📊 Sample parsed transactions:`, parsed.slice(0, 3));
              break;
            }
          }

          // Fallback parsing
          if (parsed.length === 0) {
            console.log('🔄 Pattern matching failed, trying line-by-line analysis...');
            
            const lines = allText.split(/[\n\r]+/).filter(line => line.trim().length > 10);
            console.log(`📋 Total lines found: ${lines.length}`);
            
            const transactionLines = lines.filter(line => {
              const hasDate = /\d{2}\/\d{2}/.test(line);
              const hasAmount = /\d+\.\d{2}/.test(line);
              const notHeader = !line.includes('Balance') && !line.includes('TOTAL') && !line.includes('SUMMARY');
              return hasDate && hasAmount && notHeader;
            });
            
            console.log(`🎯 Lines with dates and amounts: ${transactionLines.length}`);
            
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
              
              console.log(`✅ Line parsing successful: ${parsed.length} transactions`);
            }
          }

          console.log(`🎉 FINAL RESULT: ${parsed.length} transactions extracted`);

          if (parsed.length === 0) {
            showToast('❌ No transactions found. Please check if this is a valid bank statement PDF.', 'error');
            return;
          }

          const validTransactions = parsed.filter(t => 
            t.amount !== '0.00' && 
            t.description.length > 0 && 
            !isNaN(parseFloat(t.amount))
          );

          console.log(`✅ Valid transactions: ${validTransactions.length}`);

          setTransactions(validTransactions);
          showToast(`🎉 Successfully extracted ${validTransactions.length} transactions!`, 'success');
          
        } catch (error) {
          console.error("❌ PDF processing error:", error);
          showToast(`Failed to process PDF: ${error.message || 'Unknown error'}`, 'error');
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ File reading error:', error);
        showToast('Failed to read file', 'error');
        setLoading(false);
      };
      
      reader.readAsArrayBuffer(file);
    };
    
    script.onerror = () => {
      console.error('❌ PDF.js loading failed');
      showToast('Failed to load PDF processing library', 'error');
      setLoading(false);
    };
    
    document.head.appendChild(script);
  };

  // Calculate summary data
  const totalSpent = transactions
    .filter(t => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const totalIncome = transactions
    .filter(t => parseFloat(t.amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const netAmount = totalIncome - totalSpent;

  // Enhanced Analytics Data
  const getCategoryData = () => {
    const categorySpending: { [key: string]: number } = {};
    transactions
      .filter(t => parseFloat(t.amount) < 0)
      .forEach(t => {
        const category = t.category || 'Uncategorized';
        categorySpending[category] = (categorySpending[category] || 0) + Math.abs(parseFloat(t.amount));
      });

    return Object.entries(categorySpending)
      .map(([name, value]) => ({ 
        name, 
        value, 
        percentage: ((value / totalSpent) * 100).toFixed(1),
        count: transactions.filter(t => t.category === name && parseFloat(t.amount) < 0).length
      }))
      .sort((a, b) => b.value - a.value);
  };

  const getTopMerchants = () => {
    const merchantSpending: { [key: string]: { total: number, count: number, category: string } } = {};
    transactions
      .filter(t => parseFloat(t.amount) < 0)
      .forEach(t => {
        const merchant = t.description.slice(0, 30).replace(/[^a-zA-Z0-9\s]/g, '').trim();
        if (!merchantSpending[merchant]) {
          merchantSpending[merchant] = { total: 0, count: 0, category: t.category || 'General' };
        }
        merchantSpending[merchant].total += Math.abs(parseFloat(t.amount));
        merchantSpending[merchant].count += 1;
      });

    return Object.entries(merchantSpending)
      .map(([name, data]) => ({ 
        name, 
        total: data.total, 
        count: data.count,
        avg: data.total / data.count,
        category: data.category
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  const categoryData = getCategoryData();
  const topMerchants = getTopMerchants();

  // Colors for charts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: '100vw',
      overflow: 'hidden'
    }}>
      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '80px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#3b82f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.25rem'
          }}>
            B
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            Balynce
          </span>
        </div>
      </header>

      <main style={{ 
        margin: '0 auto', 
        padding: '2rem 4rem', 
        width: '100%', 
        maxWidth: '1200px',
        minHeight: 'calc(100vh - 80px)'
      }}>
        <div style={{ textAlign: 'center', paddingTop: '2rem', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            Transform Your Bank Statements Into Actionable Data
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#6b7280',
            marginBottom: '2rem'
          }}>
            Upload PDFs. Extract transactions. Categorize with AI. Get Smart Insights.
          </p>
        </div>

        {/* File Upload Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '12px',
          border: '2px dashed #d1d5db',
          textAlign: 'center',
          marginBottom: '3rem',
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto 3rem auto'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#f3f4f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '1.5rem'
          }}>
            {loading ? '⏳' : '⬆️'}
          </div>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            {fileName || 'Upload Bank Statement (PDF)'}
          </h3>

          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload"
            disabled={loading}
          />

          <label
            htmlFor="file-upload"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '1rem'
            }}
          >
            {fileName ? 'Upload Another PDF' : 'Select PDF File'}
          </label>
        </div>

        {/* Smart Insights Section */}
        {transactions.length > 0 && <InsightsPanel transactions={transactions} />}

        {/* Analytics Dashboard */}
        {transactions.length > 0 && (
          <div>
            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
              width: '100%'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>
                    Total Spent
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#dc2626' }}>
                    ${totalSpent.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  💸
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>
                    Total Income
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#059669' }}>
                    ${totalIncome.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#d1fae5',
                  color: '#059669',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  💰
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>
                    Net Amount
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    color: netAmount >= 0 ? '#059669' : '#dc2626'
                  }}>
                    {netAmount >= 0 ? '+' : ''}${netAmount.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: netAmount >= 0 ? '#d1fae5' : '#fee2e2',
                  color: netAmount >= 0 ? '#059669' : '#dc2626',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  {netAmount >= 0 ? '📈' : '📉'}
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              {/* Category Chart */}
              {categoryData.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '2rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                    💰 Spending by Category
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value.toFixed(2)}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Merchants Chart */}
              {topMerchants.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '2rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                    🏪 Top Merchants
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topMerchants} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'total' ? `${value.toFixed(2)}` : value,
                          name === 'total' ? 'Total Spent' : 'Visits'
                        ]}
                      />
                      <Bar dataKey="total" fill="#3b82f6" name="total" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Transaction Table */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  📋 Transactions ({transactions.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      showToast('📄 CSV exported!', 'success');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    📄 Export CSV
                  </button>
                  
                  <button
                    onClick={() => {
                      const qbCsv = [
                        'Date,Description,Account,Debit,Credit,Category',
                        ...transactions.map(t => {
                          const amount = Math.abs(parseFloat(t.amount));
                          const isDebit = parseFloat(t.amount) < 0;
                          return `${t.date},"${t.description}",Checking,${isDebit ? amount.toFixed(2) : ''},${!isDebit ? amount.toFixed(2) : ''},"${t.category || 'Uncategorized'}"`;
                        })
                      ].join('\n');
                      
                      const blob = new Blob([qbCsv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${fileName?.replace('.pdf', '') || 'transactions'}_quickbooks.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast('💼 QuickBooks exported!', 'success');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    💼 QuickBooks
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Date
                      </th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Description
                      </th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Amount
                      </th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {transaction.date}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {transaction.description}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          textAlign: 'right',
                          color: parseFloat(transaction.amount) < 0 ? '#dc2626' : '#059669',
                          fontWeight: '500'
                        }}>
                          {parseFloat(transaction.amount) < 0 ? '-' : '+'}${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
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
      </main>
    </div>
  );
}
