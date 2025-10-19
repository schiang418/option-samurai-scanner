import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TokenBasedScanner } from "./tokenBasedScanner";
import { TRPCError } from "@trpc/server";
import { scanMarket, DEFAULT_TICKERS } from "./polygonScanner";
import { generateExcelReport } from "./excelGenerator";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  scanner: router({
    /**
     * Execute bi-weekly income scan using Polygon.io API
     */
    executePolygonScan: publicProcedure.mutation(async () => {
      console.log('[API] Starting Polygon.io scan...');
      
      try {
               const result = await scanMarket(DEFAULT_TICKERS);
        console.log(`[API] Polygon scan completed with ${result.strategies.length} results, ${result.errors.length} errors`);
        
        const excelBuffer = await generateExcelReport(result.strategies, result.errors);
        
        // Calculate statistics
        const avgProbability = result.strategies.length > 0
          ? result.strategies.reduce((sum: number, s) => sum + s.prob_max_profit, 0) / result.strategies.length
          : 0;
        const avgReturn = result.strategies.length > 0
          ? result.strategies.reduce((sum: number, s) => sum + s.return_on_risk, 0) / result.strategies.length
          : 0;
        
        return {
          success: true,
          scanDate: new Date().toISOString(),
          strategy: 'Bull PUT Spread (Polygon.io)',
          resultCount: result.strategies.length,
          errorCount: result.errors.length,
          avgProbability,
          avgReturn,
          excelBase64: excelBuffer.toString('base64'),
          fileName: `Polygon_Bi-Weekly_Income_Report_${new Date().toISOString().split('T')[0]}.xlsx`
        }
      } catch (error) {
        console.error('[API] Polygon scan failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Polygon scan execution failed'
        });
      }
    }),

    /**
     * Execute bi-weekly income scan and return Excel file as base64
     */
    executeScan: publicProcedure.mutation(async () => {
      console.log('[API] Starting scan execution with saved token...');
      
      const scanner = new TokenBasedScanner();
      
      try {
        const report = await scanner.executeScan();
        
        console.log(`[API] Scan completed with ${report.results.length} results`);
        
        return {
          success: true,
          scanDate: report.scanDate,
          strategy: report.strategy,
          resultCount: report.results.length,
          excelBase64: report.excelBuffer.toString('base64'),
          fileName: `Bi-Weekly_Income_Report_${new Date().toISOString().split('T')[0]}.xlsx`
        };
      } catch (error) {
        console.error('[API] Scan failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Scan execution failed'
        });
      }
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
