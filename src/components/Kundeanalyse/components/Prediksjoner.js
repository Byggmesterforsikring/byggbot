import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Progress } from '../../ui/progress';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  Brain,
  Clock,
  Target,
  DollarSign,
  Activity,
  BookOpen
} from 'lucide-react';
import { formatCurrency, formatNumber, processTimeSeriesData } from '../utils/dataProcessing';
import { calculateAdvancedScenarios, calculateAdvancedNextClaimPrediction } from '../utils/advancedPredictionModels';
import { processDataForAdvancedPredictions } from '../utils/predictionDataProcessor';

const Prediksjoner = ({ kundeData, prediksjoner, terskler }) => {
  if (!kundeData || !prediksjoner) return null;

  // Bruk isolert prediksjons-databehandling for avanserte algoritmer
  const prediksjonsData = processDataForAdvancedPredictions(kundeData);
  const avansertAnalyse = calculateAdvancedScenarios(kundeData, prediksjonsData.processedYearData);
  const avansertNesteSkade = calculateAdvancedNextClaimPrediction(
    prediksjonsData.processedClaims,
    prediksjonsData.processedYearData,
    kundeData
  );

  // Debug logging
  console.log('🔍 Prediksjoner: Avansert neste skade-prediksjon:', avansertNesteSkade);
  console.log('🔍 Prediksjoner: Avansert scenario-analyse:', avansertAnalyse);
  console.log('🔍 Prediksjoner: Isolerte prediksjonsdata:', prediksjonsData);

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'høy': return 'text-green-600 bg-green-50';
      case 'moderat': return 'text-yellow-600 bg-yellow-50';
      case 'lav': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceProgress = (confidence) => {
    switch (confidence) {
      case 'høy': return 85;
      case 'moderat': return 60;
      case 'lav': return 30;
      default: return 0;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'høy': return 'destructive';
      case 'moderat': return 'secondary';
      case 'positiv': return 'default';
      default: return 'outline';
    }
  };

  // Beregn fremtidig risiko-score basert på avansert analyse
  const calculateAdvancedFutureRiskScore = () => {
    let score = 0;
    const faktorer = [];

    // 1. Basert på neste skade-prediksjon (vektet)
    if (avansertNesteSkade && !avansertNesteSkade.insufficient_data) {
      if (avansertNesteSkade.daysUntilNext < 7) {
        score += 30;
        faktorer.push('Neste skade forventet innen 1 uke');
      } else if (avansertNesteSkade.daysUntilNext < 14) {
        score += 20;
        faktorer.push('Neste skade forventet innen 2 uker');
      } else if (avansertNesteSkade.daysUntilNext < 30) {
        score += 10;
        faktorer.push('Neste skade forventet innen 1 måned');
      }

      // Reduser score for høy konfidensgrad
      if (avansertNesteSkade.confidence === 'høy') score -= 5;
    }

    // 2. Basert på høyrisiko produkter (fra avansert analyse)
    const høyrisikoAntall = avansertAnalyse?.produktRisiko?.filter(p =>
      p.nåværendeRisiko === 'høy' || p.nåværendeRisiko === 'moderat-høy'
    ).length || 0;

    score += høyrisikoAntall * 8;
    if (høyrisikoAntall > 0) {
      faktorer.push(`${høyrisikoAntall} produkter med høy/moderat-høy risiko`);
    }

    // 3. Basert på kostnadstrend
    const kostnadsTrend = avansertAnalyse?.trendAnalyse?.costTrend || 0;
    if (kostnadsTrend > 15) {
      score += 25;
      faktorer.push(`Økende kostnadstrend: +${kostnadsTrend.toFixed(1)}%`);
    } else if (kostnadsTrend > 5) {
      score += 10;
      faktorer.push(`Moderat kostnadstrend: +${kostnadsTrend.toFixed(1)}%`);
    }

    // 4. Basert på stabilitet
    const stabilitet = avansertAnalyse?.grunnlagsdata?.costStability || 0.5;
    if (stabilitet < 0.5) {
      score += 15;
      faktorer.push('Lav kostnadsstabilitet (høy volatilitet)');
    }

    // 5. Produkter med økende aktivitet
    const økendeRisikoProdukter = avansertNesteSkade?.detaljertAnalyse?.produktrisiko?.økendeRisikoProdukter || [];
    score += økendeRisikoProdukter.length * 12;
    if (økendeRisikoProdukter.length > 0) {
      faktorer.push(`${økendeRisikoProdukter.length} produkter med økende skadeaktivitet`);
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      faktorer,
      grunnlag: avansertAnalyse?.grunnlagsdata
    };
  };

  const futureRiskAnalysis = calculateAdvancedFutureRiskScore();

  // Sesongdata for chart
  const sesongChartData = prediksjoner.sesongmønstre ? [
    { sesong: 'Vinter', antall: prediksjoner.sesongmønstre.vinter.antall, kostnad: prediksjoner.sesongmønstre.vinter.kostnad },
    { sesong: 'Vår', antall: prediksjoner.sesongmønstre.vår.antall, kostnad: prediksjoner.sesongmønstre.vår.kostnad },
    { sesong: 'Sommer', antall: prediksjoner.sesongmønstre.sommer.antall, kostnad: prediksjoner.sesongmønstre.sommer.kostnad },
    { sesong: 'Høst', antall: prediksjoner.sesongmønstre.høst.antall, kostnad: prediksjoner.sesongmønstre.høst.kostnad }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Om prediksjonsmodellen */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <BookOpen className="h-5 w-5" />
            Om prediksjonsmodellen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 leading-relaxed">
            Prediksjoner er basert på historiske mønstre og statistisk analyse. Faktiske resultater kan avvike fra prediksjoner på grunn av endringer i risikoeksponering, eksterne faktorer eller endret atferd.
          </p>
        </CardContent>
      </Card>

      {/* Hovedprediksjoner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Neste skade-prediksjon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Neste skade-prediksjon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!avansertNesteSkade.insufficient_data ? (
              <>
                <div className={`p-4 rounded-lg ${getConfidenceColor(avansertNesteSkade.confidence)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Avansert prediksjon</span>
                  </div>
                  <p className="text-sm mb-2">{avansertNesteSkade.prediction}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Konfidensgrad:</span>
                      <span className="capitalize">{avansertNesteSkade.confidence}</span>
                    </div>
                    <Progress
                      value={getConfidenceProgress(avansertNesteSkade.confidence)}
                      color={avansertNesteSkade.confidence === 'høy' ? '#10b981' :
                        avansertNesteSkade.confidence === 'moderat' ? '#f59e0b' : '#ef4444'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Forventet dager</p>
                    <p className="font-medium">{avansertNesteSkade.daysUntilNext} dager</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dager siden siste</p>
                    <p className="font-medium">
                      {(() => {
                        const tidSistSkade = avansertNesteSkade.detaljertAnalyse?.tidSistSkade;

                        if (tidSistSkade?.dagerSistSkade !== undefined) {
                          return `${tidSistSkade.dagerSistSkade} dager`;
                        }

                        if (tidSistSkade?.no_claims) {
                          return 'Ingen skader registrert';
                        }

                        if (tidSistSkade?.error) {
                          return 'Kunne ikke beregnes';
                        }

                        // Fallback: Beregn manuelt fra skadehistorikk
                        if (kundeData.skadehistorikk && kundeData.skadehistorikk.length > 0) {
                          try {
                            const sortedClaims = kundeData.skadehistorikk.sort((a, b) => {
                              const dateA = a.skadeDato instanceof Date ? a.skadeDato : new Date(a.skadeDato);
                              const dateB = b.skadeDato instanceof Date ? b.skadeDato : new Date(b.skadeDato);
                              return dateB - dateA;
                            });
                            const lastClaim = sortedClaims[0];
                            const lastClaimDate = lastClaim.skadeDato instanceof Date ? lastClaim.skadeDato : new Date(lastClaim.skadeDato);
                            const daysSince = Math.floor((new Date() - lastClaimDate) / (1000 * 60 * 60 * 24));
                            return `${daysSince} dager`;
                          } catch (error) {
                            return 'Feil i datoberegning';
                          }
                        }

                        return 'Ikke tilgjengelig';
                      })()}
                    </p>
                  </div>
                </div>

                {/* Detaljert analyse - utvidbar */}
                <div className="mt-4 p-3 bg-gray-50 rounded border">
                  <h5 className="font-medium text-gray-700 mb-3">Analysefaktorer:</h5>
                  <div className="space-y-2 text-xs">
                    {/* Sesonganalyse */}
                    {avansertNesteSkade.detaljertAnalyse?.sesongpåvirkning && (
                      <div className="p-2 bg-white rounded">
                        <p className="font-medium">Sesongpåvirkning ({avansertNesteSkade.detaljertAnalyse.sesongpåvirkning.sesongNavn})</p>
                        <p className="text-gray-600">{avansertNesteSkade.detaljertAnalyse.sesongpåvirkning.beskrivelse}</p>
                        <p className="text-blue-600">Faktor: {avansertNesteSkade.detaljertAnalyse.sesongpåvirkning.sesongFaktor.toFixed(2)}x</p>
                      </div>
                    )}

                    {/* Trendanalyse */}
                    {avansertNesteSkade.detaljertAnalyse?.trendpåvirkning && !avansertNesteSkade.detaljertAnalyse.trendpåvirkning.insufficient_data && (
                      <div className="p-2 bg-white rounded">
                        <p className="font-medium">Frekvens-trend</p>
                        <p className="text-gray-600">{avansertNesteSkade.detaljertAnalyse.trendpåvirkning.beskrivelse}</p>
                        <p className="text-blue-600">Påvirkning: {avansertNesteSkade.detaljertAnalyse.trendpåvirkning.påvirkning}</p>
                      </div>
                    )}

                    {/* Produktrisiko */}
                    {avansertNesteSkade.detaljertAnalyse?.produktrisiko?.hovedRisikoProdukt && (
                      <div className="p-2 bg-white rounded">
                        <p className="font-medium">Høyrisiko produkt</p>
                        <p className="text-gray-600">{avansertNesteSkade.detaljertAnalyse.produktrisiko.hovedRisikoProdukt.produkt}</p>
                        <p className="text-red-600">Økning: +{avansertNesteSkade.detaljertAnalyse.produktrisiko.hovedRisikoProdukt.endring.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-yellow-50 rounded border">
                <p className="text-yellow-700">{avansertNesteSkade.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Årlig kostnadsprediksjon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Kostnadsprediksjon 2026
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(avansertAnalyse?.scenarios?.realistisk && avansertAnalyse.scenarios.realistisk.predikertKostnad > 0) ? (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Predikert årlig skadekostnad (2026)</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(avansertAnalyse.scenarios.realistisk.predikertKostnad)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Konfidensintervall: {formatCurrency(avansertAnalyse.scenarios.realistisk.konfidensIntervall?.nedre || 0)} - {formatCurrency(avansertAnalyse.scenarios.realistisk.konfidensIntervall?.øvre || 0)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Historisk gjennomsnitt (5 år)</p>
                    <p className="font-medium">
                      {formatCurrency(avansertAnalyse.grunnlagsdata?.avgAnnualCost || 0)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Kostnadstrend</p>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${(avansertAnalyse.trendAnalyse?.costTrend || 0) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                        {(avansertAnalyse.trendAnalyse?.costTrend || 0) > 0 ? '+' : ''}
                        {(avansertAnalyse.trendAnalyse?.costTrend || 0).toFixed(1)}%
                      </p>
                      {(avansertAnalyse.trendAnalyse?.costTrend || 0) > 10 && (
                        <Badge variant="error">Høy økning</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Konfidensgrad:</span>
                      <span>{((avansertAnalyse.scenarios.realistisk.konfidensgrad || 0.6) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={(avansertAnalyse.scenarios.realistisk.konfidensgrad || 0.6) * 100}
                      color={(avansertAnalyse.scenarios.realistisk.konfidensgrad || 0.6) > 0.7 ? '#10b981' :
                        (avansertAnalyse.scenarios.realistisk.konfidensgrad || 0.6) > 0.5 ? '#f59e0b' : '#ef4444'}
                    />
                  </div>
                </div>

                {/* Detaljerte justeringsfaktorer */}
                {avansertAnalyse.scenarios.realistisk.justeringer?.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded border">
                    <h5 className="font-medium text-gray-700 mb-3">Kostnadsjusteringer:</h5>
                    <div className="space-y-2 text-xs">
                      {avansertAnalyse.scenarios.realistisk.justeringer.map((justering, index) => (
                        <div key={index} className="p-2 bg-white rounded border">
                          <p className="font-medium">{justering.type}</p>
                          <p className="text-gray-600">{justering.beskrivelse}</p>
                          {justering.påvirkning !== 0 && (
                            <p className={`font-medium ${justering.påvirkning > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {justering.påvirkning > 0 ? '+' : ''}{justering.påvirkning.toFixed(1)}% påvirkning
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Fallback til gammel kostnadsprediksjon hvis ny ikke fungerer */}
                {prediksjoner.årligKostnad ? (
                  <>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-700">
                        <strong>Fallback-prediksjon:</strong> Bruker enklere algoritme da avansert analyse ikke ga gyldige resultater.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Predikert årlig skadekostnad</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(prediksjoner.årligKostnad.predictedAnnualCost)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Historisk gjennomsnitt</p>
                        <p className="font-medium">
                          {formatCurrency(prediksjoner.årligKostnad.avgHistoricalCost)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Trendkorrigering</p>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${prediksjoner.årligKostnad.trendAdjustment > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {prediksjoner.årligKostnad.trendAdjustment > 0 ? '+' : ''}
                            {prediksjoner.årligKostnad.trendAdjustment.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Ikke nok data for kostnadsprediksjon</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fremtidig risiko-score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Fremtidig risiko-vurdering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Samlet risiko-score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress
                      value={futureRiskAnalysis.score}
                      className="h-3"
                      color={futureRiskAnalysis.score > 70 ? '#ef4444' : futureRiskAnalysis.score > 40 ? '#f59e0b' : '#10b981'}
                    />
                  </div>
                  <span className="font-bold text-lg">{futureRiskAnalysis.score}/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {futureRiskAnalysis.score > 70 ? 'Høy risiko' : futureRiskAnalysis.score > 40 ? 'Moderat risiko' : 'Lav risiko'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Gjennomsnittlig tid mellom skader</p>
                <p className="text-xl font-bold">
                  {Math.round(avansertNesteSkade?.detaljertAnalyse?.grunnfrekvens?.gjennomsnittligIntervall || 0)} dager
                </p>
                <p className="text-xs text-muted-foreground">
                  Basert på {avansertNesteSkade?.detaljertAnalyse?.grunnfrekvens?.antallIntervaller || 0} historiske intervaller
                </p>
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-medium mb-3">Identifiserte risikofaktorer</h4>
              <div className="space-y-2">
                {futureRiskAnalysis.faktorer?.map((faktor, index) => (
                  <Alert key={index} variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {faktor}
                    </AlertDescription>
                  </Alert>
                ))}

                {futureRiskAnalysis.faktorer?.length === 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      Ingen kritiske risikofaktorer identifisert. Stabil risikoprofil basert på avansert analyse.
                    </p>
                  </div>
                )}

                {/* Datagrunnlag-info */}
                <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
                  <h5 className="font-medium text-gray-700 mb-2">Analysegrunnlag:</h5>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• {avansertAnalyse?.grunnlagsdata?.dataPoints || 0} års historiske data</p>
                    <p>• {avansertNesteSkade?.detaljertAnalyse?.grunnfrekvens?.antallIntervaller || 0} skade-intervaller analysert</p>
                    <p>• Kostnadsstabilitet: {((avansertAnalyse?.grunnlagsdata?.costStability || 0) * 100).toFixed(0)}%</p>
                    <p>• Frekvens-stabilitet: {((avansertAnalyse?.grunnlagsdata?.frequencyStability || 0) * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sesongmønstre */}
      {sesongChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sesongmønstre i skader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sesongChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sesong" />
                  <YAxis yAxisId="left" label={{ value: 'Antall skader', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Total kostnad', angle: 90, position: 'insideRight' }} />
                  <RechartsTooltip
                    formatter={(value, name) => {
                      if (name === 'Total kostnad') return [formatCurrency(value), name];
                      return [formatNumber(value), name];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="antall" fill="#7c3aed" name="Antall skader" />
                  <Line yAxisId="right" type="monotone" dataKey="kostnad" stroke="#ef4444" strokeWidth={2} name="Total kostnad" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {sesongChartData.map((sesong, index) => (
                <div key={index} className="text-center p-3 border rounded-lg">
                  <h4 className="font-medium">{sesong.sesong}</h4>
                  <p className="text-sm text-muted-foreground">{formatNumber(sesong.antall)} skader</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(sesong.kostnad)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
};

export default Prediksjoner;
