import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Download, Loader2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ScanResult {
  resultCount: number;
  avgProbability?: number;
  avgReturn?: number;
  scanDate: string;
  strategy: string;
}

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [isPolygonScanning, setIsPolygonScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const scanMutation = trpc.scanner.executeScan.useMutation();
  const polygonScanMutation = trpc.scanner.executePolygonScan.useMutation();

  const downloadExcel = (result: any) => {
    // Convert base64 to blob and download
    const byteCharacters = atob(result.excelBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleScan = async () => {
    setIsScanning(true);
    
    try {
      const result = await scanMutation.mutateAsync();
      downloadExcel(result);
      toast.success(`掃描完成!找到 ${result.resultCount} 個交易機會`);
    } catch (error) {
      toast.error('掃描失敗,請稍後再試');
      console.error('Scan error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePolygonScan = async () => {
    setIsPolygonScanning(true);
    setLastResult(null);
    
    try {
      const result = await polygonScanMutation.mutateAsync();
      downloadExcel(result);
      
      // Update last result
      setLastResult({
        resultCount: result.resultCount,
        avgProbability: result.avgProbability,
        avgReturn: result.avgReturn,
        scanDate: result.scanDate,
        strategy: result.strategy
      });
      
      toast.success(`Polygon.io 掃描完成!找到 ${result.resultCount} 個交易機會`);
    } catch (error) {
      toast.error('Polygon.io 掃描失敗,請稍後再試');
      console.error('Polygon scan error:', error);
    } finally {
      setIsPolygonScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Option Samurai Scanner</h1>
          </div>
          <p className="text-lg text-gray-600">
            自動掃描雙週收入選擇權策略
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Bi-Weekly Income 策略掃描</CardTitle>
            <CardDescription>
              點擊下方按鈕即時執行 Bull PUT Spread 策略掃描,生成 Excel 報告
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Polygon.io Scan Button */}
            <div className="space-y-2">
              <Button
                onClick={handlePolygonScan}
                disabled={isPolygonScanning || isScanning}
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isPolygonScanning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Polygon.io 掃描中... (約需 2-3 分鐘)
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    使用 Polygon.io API 掃描
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-gray-500">
                推薦使用 Polygon.io - 完全自動化,無需登入
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">或</span>
              </div>
            </div>

            {/* Option Samurai Scan Button */}
            <div className="space-y-2">
              <Button
                onClick={handleScan}
                disabled={isScanning || isPolygonScanning}
                size="lg"
                variant="outline"
                className="w-full h-14 text-lg"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    掃描中... (約需 30-60 秒)
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    使用 Option Samurai 掃描
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-gray-500">
                需要 Option Samurai 帳號登入
              </p>
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">策略說明</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>策略類型:</strong> Bull PUT Spread (牛市看跌價差)</li>
                <li>• <strong>到期時間:</strong> 10-18 天</li>
                <li>• <strong>獲利機率:</strong> &gt; 80%</li>
                <li>• <strong>篩選條件:</strong> 高成交量、高獲利機率、固定價差</li>
              </ul>
            </div>

            {/* Results Display */}
            {lastResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-3">最新掃描結果</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{lastResult.resultCount}</div>
                    <div className="text-sm text-gray-600">交易機會</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {lastResult.avgProbability ? `${(lastResult.avgProbability * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">平均獲利機率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {lastResult.avgReturn ? `${(lastResult.avgReturn * 100).toFixed(2)}%` : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">平均報酬率</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-center mt-2">
                  掃描時間: {new Date(lastResult.scanDate).toLocaleString('zh-TW')}
                </div>
              </div>
            )}

            {/* Default Stats (when no scan result) */}
            {!lastResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">21+</div>
                  <div className="text-sm text-gray-600">交易機會</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">96%+</div>
                  <div className="text-sm text-gray-600">平均獲利機率</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">1.76%</div>
                  <div className="text-sm text-gray-600">平均報酬率</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>數據來源: Option Samurai | 即時掃描 | 完全免費</p>
        </div>
      </div>
    </div>
  );
}
