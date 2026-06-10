'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ArrowLeft, Camera, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DragDropZone } from '@/components/upload/drag-drop-zone';
import { toast } from '@/stores/toast-store';
import { ParseReceiptResult } from '@/lib/ai/ai';
import { confirmAndLogReceipt } from './actions';

export default function UploadPage() {
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParseReceiptResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleParseReceipt = async () => {
    if (!file) return;

    setIsParsing(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/ai/parse-receipt', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to parse receipt.');
      }

      setParsedData(json.data);
      toast({
        title: 'Parsing Complete',
        description: `Successfully extracted ${json.data.items.length} items from your receipt!`,
        type: 'success',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Parsing Failed',
        description: message,
        type: 'error',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedData) return;

    setIsConfirming(true);
    try {
      const result = await confirmAndLogReceipt(parsedData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Impact Logged!',
        description: `You earned ${result.karmaEarned} Karma Points for your choices.`,
        type: 'success',
        duration: 6000,
      });

      router.push('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Failed to Log Receipt',
        description: message,
        type: 'error',
      });
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-3xl opacity-40 animate-pulse-glow" style={{ animationDuration: '6s' }} />
      
      <div className="max-w-3xl mx-auto z-10 relative">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Live Announcer for Screen Readers */}
        <div aria-live="polite" className="sr-only">
          {isParsing ? 'Uploading and analyzing image with Gemini AI...' : ''}
          {parsedData && !isConfirming ? `AI analysis complete. Review the ${parsedData.items.length} items found.` : ''}
          {isConfirming ? 'Saving your items and calculating Karma points...' : ''}
        </div>

        <AnimatePresence mode="wait">
          {!parsedData ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass border-border/50 shadow-xl backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-2xl text-emerald-950 flex items-center gap-2">
                    <Camera className="h-6 w-6 text-emerald-600" />
                    Scan Receipt or Product
                  </CardTitle>
                  <CardDescription>
                    Upload a picture of a grocery receipt, fuel bill, or sustainable product. Our AI will automatically estimate its carbon footprint.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DragDropZone onFileSelected={setFile} disabled={isParsing} />
                </CardContent>
                <CardFooter className="flex justify-end border-t border-border/50 pt-6">
                  <Button 
                    onClick={handleParseReceipt} 
                    disabled={!file || isParsing}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    size="lg"
                  >
                    {isParsing ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        Analyse with AI <Sparkles className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="glass border-border/50 shadow-xl backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl text-emerald-950 flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-emerald-600" />
                        AI Analysis Complete
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Found {parsedData.items.length} items at <strong>{parsedData.store_name}</strong> (Total: ₹{parsedData.total_inr})
                      </CardDescription>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-medium text-[#4a6a4a] mb-1">Sustainability Score</div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${parsedData.overall_sustainability_score > 70 ? 'bg-emerald-500' : parsedData.overall_sustainability_score > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${parsedData.overall_sustainability_score}%` }} 
                          />
                        </div>
                        <span className="text-sm font-bold">{parsedData.overall_sustainability_score}/100</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <div className="p-6">
                  <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-lg text-sm mb-6 flex items-start gap-3">
                    <Leaf className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p>{parsedData.feedback_message}</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-[#4a6a4a] uppercase bg-white/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">Item</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Est. CO₂</th>
                          <th className="px-4 py-3 rounded-tr-lg">Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-border/50 hover:bg-white/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-emerald-950">
                              {item.name}
                              <div className="text-xs text-[#4a6a4a] font-normal">{item.quantity} {item.unit} • ₹{item.price_inr}</div>
                            </td>
                            <td className="px-4 py-3 capitalize">{item.category}</td>
                            <td className="px-4 py-3 text-right font-mono">
                              {item.estimated_kg_co2} kg
                            </td>
                            <td className="px-4 py-3">
                              {item.sustainability_factor === 'sustainable' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  Eco-Friendly
                                </span>
                              )}
                              {item.sustainability_factor === 'neutral' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Neutral
                                </span>
                              )}
                              {item.sustainability_factor === 'high_carbon' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 gap-1">
                                  <AlertTriangle className="h-3 w-3" /> High Carbon
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <CardFooter className="flex justify-between border-t border-border/50 pt-6 bg-white/30">
                  <Button 
                    variant="outline" 
                    onClick={() => setParsedData(null)}
                    disabled={isConfirming}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isConfirming ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Logging to Profile...
                      </>
                    ) : (
                      <>
                        Confirm & Log Impact <Leaf className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
