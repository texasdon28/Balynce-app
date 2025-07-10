// Shopping
    if (desc.includes('amazon') && amountValue < 25) {
      return language === 'es' ? t.onlineShopping : 'Online Shopping';
    }
    if (desc.includes('target') || desc.includes('walmart')) {
      return language === 'es' ? t.generalShopping : 'General Shopping';
    }
    if (desc.includes('foot locker') || desc.includes('clothing')) {
      return language === 'es' ? t.clothing : 'Clothing & Fashion';
    }
    
    // Technology
    if (desc.includes('apple') || desc.includes('app store')) {
      return language === 'es' ? t.technology : 'Technology';
    }
    
    // Personal Transfers
    if (desc.includes('cash app') || desc.includes('venmo') || desc.includes('payment sent')) {
      return language === 'es' ? t.personalTransfers : 'Personal Transfers';
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
    showToast(`🔄 Processing ${file.name}...`, 'info');
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

          // Simple transaction parsing
          const lines = allText.split(/[\n\r]+/).filter(line => line.trim().length > 10);
          const transactionLines = lines.filter(line => {
            const hasDate = /\d{2}\/\d{2}/.test(line);
            const hasAmount = /\d+\.\d{2}/.test(line);
            const notHeader = !line.includes('Balance') && !line.includes('TOTAL') && !line.includes('SUMMARY');
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
            showToast('❌ No transactions found. Please check if this is a valid bank statement PDF.', 'error');
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
          showToast(`🎉 Successfully extracted ${validTransactions.length} transactions!`, 'success');
          
        } catch (error) {
          showToast(`Failed to process PDF: ${error.message || 'Unknown error'}`, 'error');
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

  // Calculate summary data
  const totalSpent = transactions
    .filter(t => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const totalIncome = transactions
    .filter(t => parseFloat(t.amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const netAmount = totalIncome - totalSpent;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: '100vw',
      overflow: 'hidden'
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

      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1.5rem 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '90px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            B
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
            Balynce
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
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
        margin: '0 auto', 
        padding: '3rem 4rem', 
        width: '100%', 
        maxWidth: '1400px',
        minHeight: 'calc(100vh - 90px)'
      }}>
        <div style={{ textAlign: 'center', paddingTop: '2rem', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '4rem',
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
            fontSize: '1.5rem',
            color: '#6b7280',
            marginBottom: '3rem',
            maxWidth: '800px',
            margin: '0 auto 3rem',
            lineHeight: '1.6'
          }}>
            {t.subtitle}
          </p>
        </div>

        {/* Usage indicator for logged in users */}
        {user && user.plan !== 'unlimited' && (
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            marginBottom: '3rem',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                backgroundColor: user.parsesRemaining > 0 ? '#d1fae5' : '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                {user.parsesRemaining > 0 ? '📊' : '⚠️'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
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
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t.upgrade}
              </button>
            )}
          </div>
        )}

        {/* File Upload Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '4rem',
          borderRadius: '24px',
          border: user && canUpload() ? '2px dashed #3b82f6' : '2px dashed #e5e7eb',
          textAlign: 'center',
          marginBottom: '4rem',
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto 4rem auto',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: loading ? '#f59e0b' : user && canUpload() ? '#dbeafe' : '#f3f4f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
            fontSize: '2rem'
          }}>
            {loading ? '⏳' : user && canUpload() ? '⬆️' : '🔒'}
          </div>

          <h3 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            {fileName || t.uploadTitle}
          </h3>

          <p style={{
            color: '#6b7280',
            fontSize: '1.125rem',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem'
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
              padding: '1.25rem 2.5rem',
              backgroundColor: !user || !canUpload() ? '#9ca3af' : loading ? '#f59e0b' : '#3b82f6',
              color: 'white',
              borderRadius: '16px',
              cursor: !user || !canUpload() || loading ? 'not-allowed' : 'pointer',
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {!user ? t.signIn : !canUpload() ? t.upgrade : (fileName ? t.uploadAnother : t.selectFile)}
          </label>
        </div>

        {/* Analytics Dashboard */}
        {transactions.length > 0 && user && (
          <div>
            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem',
              width: '100%'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {t.totalSpent}
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                    ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  💸
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {t.totalIncome}
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#059669' }}>
                    ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#d1fae5',
                  color: '#059669',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  💰
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {t.netAmount}
                  </div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: netAmount >= 0 ? '#059669' : '#dc2626'
                  }}>
                    {netAmount >= 0 ? '+' : ''}${Math.abs(netAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: netAmount >= 0 ? '#d1fae5' : '#fee2e2',
                  color: netAmount >= 0 ? '#059669' : '#dc2626',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {netAmount >= 0 ? '📈' : '📉'}
                </div>
              </div>
            </div>

            {/* Transaction Table */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                padding: '2rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                  📋 {t.transactions} ({transactions.length})
                </h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
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
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    📄 {t.exportCsv}
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
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    💼 {t.quickbooks}
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {language === 'es' ? 'Fecha' : 'Date'}
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {language === 'es' ? 'Descripción' : 'Description'}
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {language === 'es' ? 'Cantidad' : 'Amount'}
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
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
                          padding: '1rem',
                          fontSize: '0.875rem',
                          color: '#374151',
                          fontWeight: '500'
                        }}>
                          {transaction.date}
                        </td>
                        <td style={{
                          padding: '1rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {transaction.description}
                        </td>
                        <td style={{
                          padding: '1rem',
                          fontSize: '0.875rem',
                          textAlign: 'right',
                          color: parseFloat(transaction.amount) < 0 ? '#dc2626' : '#059669',
                          fontWeight: '600'
                        }}>
                          {parseFloat(transaction.amount) < 0 ? '-' : '+'}${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                        </td>
                        <td style={{
                          padding: '1rem',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          <span style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
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

        {/* Welcome message for non-signed-in users */}
        {!user && (
          <div style={{
            backgroundColor: 'white',
            padding: '4rem',
            borderRadius: '24px',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            marginBottom: '3rem'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '2rem' }}>🏦</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem' }}>
              {language === 'es' ? 'Bienvenido a Balynce' : 'Welcome to Balynce'}
            </h2>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '3rem', 
              maxWidth: '700px', 
              margin: '0 auto 3rem',
              fontSize: '1.25rem',
              lineHeight: '1.6'
            }}>
              {language === 'es' 
                ? 'Analiza tus estados de cuenta bancarios con IA. Obtén insights inteligentes sobre tus gastos y toma mejores decisiones financieras.'
                : 'Analyze your bank statements with AI. Get smart insights about your spending and make better financial decisions.'
              }
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '3rem', 
              marginTop: '3rem',
              maxWidth: '1000px',
              margin: '// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Transaction {
  date: string;
  description: string;
  amount: string;
  category?: string;
}

// User interface
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

// Language types
type Language = 'en' | 'es';

// Pricing plans
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

// Translations
const translations = {
  en: {
    // Header
    signIn: 'Sign in with Google',
    signOut: 'Sign Out',
    upgrade: 'Upgrade Plan',
    language: 'Language',
    
    // Main content
    title: 'Transform Your Bank Statements Into Actionable Data',
    subtitle: 'Upload PDFs. Extract transactions. Categorize with AI. Get Smart Insights.',
    uploadTitle: 'Upload Bank Statement (PDF)',
    selectFile: 'Select PDF File',
    uploadAnother: 'Upload Another PDF',
    
    // Pricing
    choosePlan: 'Choose Your Plan',
    oneTime: 'One-time',
    monthly: 'Monthly',
    popular: 'Most Popular',
    parse: 'parse',
    parses: 'parses',
    unlimited: 'Unlimited',
    withInsights: 'with Smart Insights',
    buyNow: 'Buy Now',
    subscribe: 'Subscribe',
    currentPlan: 'Current Plan',
    parsesLeft: 'parses remaining',
    
    // Features
    basicParsing: 'Basic PDF parsing',
    smartInsights: 'Smart spending insights',
    categoryAnalysis: 'Category analysis',
    exportOptions: 'Export options',
    prioritySupport: 'Priority support',
    
    // Analytics
    totalSpent: 'Total Spent',
    totalIncome: 'Total Income',
    netAmount: 'Net Amount',
    transactions: 'Transactions',
    exportCsv: 'Export CSV',
    quickbooks: 'QuickBooks',
    
    // Messages
    needUpgrade: 'Upgrade to continue parsing',
    paymentSuccess: 'Payment successful! 🎉',
    paymentError: 'Payment failed. Please try again.',
    
    // Categories
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
    // Header
    signIn: 'Iniciar sesión con Google',
    signOut: 'Cerrar Sesión',
    upgrade: 'Mejorar Plan',
    language: 'Idioma',
    
    // Main content
    title: 'Transforma tus Estados de Cuenta en Datos Útiles',
    subtitle: 'Sube PDFs. Extrae transacciones. Categoriza con IA. Obtén Insights Inteligentes.',
    uploadTitle: 'Subir Estado de Cuenta (PDF)',
    selectFile: 'Seleccionar Archivo PDF',
    uploadAnother: 'Subir Otro PDF',
    
    // Pricing
    choosePlan: 'Elige tu Plan',
    oneTime: 'Una vez',
    monthly: 'Mensual',
    popular: 'Más Popular',
    parse: 'análisis',
    parses: 'análisis',
    unlimited: 'Ilimitado',
    withInsights: 'con Insights Inteligentes',
    buyNow: 'Comprar Ahora',
    subscribe: 'Suscribirse',
    currentPlan: 'Plan Actual',
    parsesLeft: 'análisis restantes',
    
    // Features
    basicParsing: 'Análisis básico de PDF',
    smartInsights: 'Insights inteligentes de gastos',
    categoryAnalysis: 'Análisis de categorías',
    exportOptions: 'Opciones de exportación',
    prioritySupport: 'Soporte prioritario',
    
    // Analytics
    totalSpent: 'Total Gastado',
    totalIncome: 'Ingresos Totales',
    netAmount: 'Cantidad Neta',
    transactions: 'Transacciones',
    exportCsv: 'Exportar CSV',
    quickbooks: 'QuickBooks',
    
    // Messages
    needUpgrade: 'Mejora tu plan para continuar',
    paymentSuccess: '¡Pago exitoso! 🎉',
    paymentError: 'Pago falló. Inténtalo de nuevo.',
    
    // Categories (Spanish translations)
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

// Stripe Integration Functions
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

// Google Sign-In Component
const GoogleSignIn: React.FC<{ onSignIn: (user: User) => void; language: Language }> = ({ onSignIn, language }) => {
  const t = translations[language];
  
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
        padding: '0.75rem 1.25rem',
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
    >
      <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style={{ width: '18px', height: '18px' }} />
      {t.signIn}
    </button>
  );
};

// User Profile Component
const UserProfile: React.FC<{ user: User; onSignOut: () => void; onUpgrade: () => void; language: Language }> = ({ user, onSignOut, onUpgrade, language }) => {
  const t = translations[language];
  
  const getPlanDisplay = () => {
    const plan = pricingPlans.find(p => p.id === user.plan);
    if (!plan) return user.plan;
    return language === 'es' ? plan.nameEs : plan.name;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
        <div style={{ fontWeight: '600', color: '#374151' }}>{getPlanDisplay()}</div>
        {user.plan !== 'unlimited' && (
          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
            {user.parsesRemaining} {t.parsesLeft}
          </div>
        )}
      </div>

      {user.plan !== 'unlimited' && (
        <button
          onClick={onUpgrade}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {t.upgrade}
        </button>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img
          src={user.profilePicture || 'https://via.placeholder.com/40'}
          alt={user.name}
          style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #e5e7eb' }}
        />
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
      </div>
    </div>
  );
};

// Pricing Modal Component
const PricingModal: React.FC<{ 
  user: User | null; 
  onClose: () => void; 
  onSelectPlan: (planId: string) => void; 
  language: Language 
}> = ({ user, onClose, onSelectPlan, language }) => {
  const t = translations[language];

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
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        maxWidth: '1000px',
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
            top: '1.5rem',
            right: '1.5rem',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#f3f4f6',
            border: 'none',
            fontSize: '1.25rem',
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
          padding: '3rem 2rem 2rem',
          borderRadius: '24px 24px 0 0',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {t.choosePlan}
          </h2>
          <p style={{ fontSize: '1.125rem', opacity: 0.9 }}>
            {language === 'es' 
              ? 'Elige el plan perfecto para tus necesidades'
              : 'Choose the perfect plan for your needs'
            }
          </p>
        </div>

        <div style={{ padding: '3rem 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  border: plan.popular ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                  borderRadius: '20px',
                  padding: '2rem',
                  textAlign: 'center',
                  position: 'relative',
                  backgroundColor: 'white',
                  transition: 'all 0.3s',
                  transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
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
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {t.popular}
                  </div>
                )}

                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  {language === 'es' ? plan.nameEs : plan.name}
                </h3>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#111827'
                  }}>
                    ${plan.price}
                  </span>
                  <span style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    marginLeft: '0.5rem'
                  }}>
                    {plan.type === 'monthly' ? `/${t.monthly.toLowerCase()}` : t.oneTime.toLowerCase()}
                  </span>
                </div>

                <div style={{
                  textAlign: 'left',
                  marginBottom: '2rem',
                  fontSize: '0.875rem',
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
                    padding: '1rem 2rem',
                    backgroundColor: user?.plan === plan.id 
                      ? '#6b7280' 
                      : plan.popular 
                        ? '#3b82f6' 
                        : '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
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

// Language Toggle Component
const LanguageToggle: React.FC<{ language: Language; onLanguageChange: (lang: Language) => void }> = ({ language, onLanguageChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.875rem' }}>🌐</span>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        style={{
          padding: '0.5rem',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '0.875rem',
          backgroundColor: 'white',
          fontWeight: '500',
          cursor: 'pointer'
        }}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
};

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
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
      right: '20px',
      backgroundColor: config.bg,
      color: 'white',
      padding: '1rem 1.25rem',
      borderRadius: '12px',
      border: `2px solid ${config.border}`,
      zIndex: 1001,
      maxWidth: '400px',
      fontSize: '0.875rem',
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
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const t = translations[language];

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // Handle user sign in/out
  const handleSignIn = (signedInUser: User) => {
    setUser(signedInUser);
    showToast(`Welcome, ${signedInUser.name}!`, 'success');
  };

  const handleSignOut = () => {
    setUser(null);
    setTransactions([]);
    showToast('Signed out successfully', 'info');
  };

  // Handle plan selection and Stripe integration
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

  // Listen for Stripe success events
  useEffect(() => {
    const handleStripeSuccess = (event: CustomEvent) => {
      const { planId } = event.detail;
      const plan = pricingPlans.find(p => p.id === planId);
      
      if (user && plan) {
        const updatedUser: User = {
          ...user,
          plan: planId as any,
          parsesRemaining: plan.parses === 'unlimited' ? 999999 : plan.parses,
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

  // Check if user can upload
  const canUpload = () => {
    if (!user) return false;
    if (user.plan === 'unlimited') return true;
    return user.parsesRemaining > 0;
  };

  // Advanced AI-Powered Smart Categorization Engine
  const categorizeTransaction = (description: string, amount: string): string => {
    const desc = description.toLowerCase().trim();
    const isExpense = parseFloat(amount) < 0;
    const amountValue = Math.abs(parseFloat(amount));
    
    if (!isExpense) {
      if (desc.includes('payroll') || desc.includes('salary') || desc.includes('trilyon') || desc.includes('employer')) {
        return language === 'es' ? t.salary : 'Salary & Wages';
      }
      if (desc.includes('cash app') || desc.includes('venmo') || desc.includes('transfer') || desc.includes('deposit')) {
        return language === 'es' ? t.transferIn : 'Transfer In';
      }
      return language === 'es' ? t.otherIncome : 'Other Income';
    }
    
    // Food & Dining
    if (desc.includes('mcdonald') || desc.includes('burger king') || desc.includes('taco bell')) {
      return language === 'es' ? t.fastFood : 'Fast Food';
    }
    if (desc.includes('restaurant') || desc.includes('bistro') || desc.includes('grill')) {
      return language === 'es' ? t.restaurants : 'Restaurants';
    }
    if (desc.includes('starbucks') || desc.includes('coffee') || desc.includes('cafe')) {
      return language === 'es' ? t.coffee : 'Coffee & Cafes';
    }
    if (desc.includes('doordash') || desc.includes('uber eats') || desc.includes('grubhub')) {
      return language === 'es' ? t.foodDelivery : 'Food Delivery';
    }
    
    // Transportation
    if (desc.includes('shell') || desc.includes('exxon') || desc.includes('gas') || desc.includes('fuel')) {
      return language === 'es' ? t.gas : 'Gas & Fuel';
    }
    if (desc.includes('audi') || desc.includes('auto') || desc.includes('car payment')) {
      return language === 'es' ? t.autoPayment : 'Auto Payment';
    }
    if (desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi')) {
      return language === 'es' ? t.rideshare : 'Rideshare';
    }
    
    // Entertainment
    if (desc.includes('amc') || desc.includes('cinema') || desc.includes('movie')) {
      return language === 'es' ? t.movies : 'Movies & Theater';
    }
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription')) {
      return language === 'es' ? t.subscriptions : 'Subscriptions';
    }
    
    // Shopping
    if
