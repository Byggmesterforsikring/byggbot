import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';

import {
  BarChart3,
  PieChart as PieIcon,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  Eye,
  DollarSign,
  Activity,
  FileText
} from 'lucide-react';
import { processProductData, formatCurrency, formatPercent, formatNumber } from '../utils/dataProcessing';

const ProduktAnalyse = ({ kundeData, terskler }) => {
  const [sortBy, setSortBy] = useState('skadeProsent');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showHighRiskProducts, setShowHighRiskProducts] = useState(false);
  const [showActiveClaimProducts, setShowActiveClaimProducts] = useState(false);

  if (!kundeData) return null;

  const produktData = processProductData(kundeData.nøkkeltallSammendrag, kundeData);

  // Filtrering og sortering
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = produktData;



    // Sortering
    return filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [produktData, sortBy, sortOrder]);





  // Farger for risk levels (bar chart)
  const getRiskColor = (skadeProsent) => {
    if (skadeProsent > terskler.skadeProsent) return '#ef4444'; // Rød
    if (skadeProsent > 50) return '#f59e0b'; // Gul
    return '#10b981'; // Grønn
  };

  const getRiskBadge = (skadeProsent) => {
    if (skadeProsent > terskler.skadeProsent) return <Badge variant="error">Høy risiko</Badge>;
    if (skadeProsent > 50) return <Badge variant="secondary">Moderat risiko</Badge>;
    return <Badge variant="success">Lav risiko</Badge>;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  // Høyrisiko produkter
  const høyrisikoProduker = filteredAndSortedProducts.filter(p => p.skadeProsent > terskler.skadeProsent);

  // Produkter med aktive skader
  const produkterMedAktiveSkader = useMemo(() => {
    const produkterMedÅpneSkader = new Set();
    if (kundeData.skadehistorikk) {
      kundeData.skadehistorikk
        .filter(skade => skade.åpen === 1)
        .forEach(skade => {
          if (skade.produktNavn) {
            produkterMedÅpneSkader.add(skade.produktNavn);
          }
        });
    }
    return produkterMedÅpneSkader.size;
  }, [kundeData.skadehistorikk]);

  // Liste over produkter med aktive skader
  const produkterMedAktiveSkaderListe = useMemo(() => {
    const produktMap = new Map();
    if (kundeData.skadehistorikk) {
      kundeData.skadehistorikk
        .filter(skade => skade.åpen === 1)
        .forEach(skade => {
          if (skade.produktNavn) {
            if (!produktMap.has(skade.produktNavn)) {
              produktMap.set(skade.produktNavn, {
                navn: skade.produktNavn,
                antallÅpneSkader: 0,
                totalReservert: 0
              });
            }
            const produkt = produktMap.get(skade.produktNavn);
            produkt.antallÅpneSkader++;
            produkt.totalReservert += skade.reservert || 0;
          }
        });
    }
    return Array.from(produktMap.values());
  }, [kundeData.skadehistorikk]);

  // Mest problematiske produkt (kombinert frekvens og beløp)
  const mestProblematiskeProdukt = useMemo(() => {
    if (filteredAndSortedProducts.length === 0) return null;

    // Beregn kombinert risikoscore for hvert produkt
    const produkterMedRisikoScore = filteredAndSortedProducts.map(product => {
      // Skadefrekvens per år (normalisert til 0-1 skala)
      const maxFrekvens = Math.max(...filteredAndSortedProducts.map(p => p.antallSkader / 5)); // 5 år
      const normalizedFrekvens = maxFrekvens > 0 ? (product.antallSkader / 5) / maxFrekvens : 0;

      // Gjennomsnittlig skadekostnad (normalisert til 0-1 skala)
      const avgSkadekostnad = product.antallSkader > 0 ? product.skadebeløp / product.antallSkader : 0;
      const maxAvgKostnad = Math.max(...filteredAndSortedProducts.map(p =>
        p.antallSkader > 0 ? p.skadebeløp / p.antallSkader : 0
      ));
      const normalizedKostnad = maxAvgKostnad > 0 ? avgSkadekostnad / maxAvgKostnad : 0;

      // Kombinert score (70% frekvens, 30% kostnad)
      const risikoScore = (normalizedFrekvens * 0.7) + (normalizedKostnad * 0.3);

      return {
        ...product,
        skadefrekvens: product.antallSkader / 5, // skader per år
        avgSkadekostnad,
        risikoScore
      };
    });

    // Finn produktet med høyest kombinert risikoscore
    return produkterMedRisikoScore.reduce((worst, current) =>
      current.risikoScore > worst.risikoScore ? current : worst
    );
  }, [filteredAndSortedProducts]);

  return (
    <div className="space-y-6">
      {/* Produktdetaljer modal overlay */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {selectedProduct.produktNavn}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProduct(null)}
                className="hover:bg-red-100 text-lg"
              >
                ✕
              </Button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Produktkode</p>
                  <p className="font-medium">{selectedProduct.produktKode}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Opptjent premie</p>
                  <p className="font-medium">{formatCurrency(selectedProduct.opptjentPremie)}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Skadebeløp</p>
                  <p className="font-medium">{formatCurrency(selectedProduct.skadebeløp)}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Netto resultat</p>
                  <p className={`font-medium ${(selectedProduct.opptjentPremie - selectedProduct.skadebeløp) > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                    }`}>
                    {formatCurrency(selectedProduct.opptjentPremie - selectedProduct.skadebeløp)}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Skadeprosent</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatPercent(selectedProduct.skadeProsent)}</p>
                    {getRiskBadge(selectedProduct.skadeProsent)}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Antall skader</p>
                  <p className="font-medium">{formatNumber(selectedProduct.antallSkader)}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Skader per år</p>
                  <p className="font-medium">{formatNumber(selectedProduct.skaderPerÅr, 1)}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Risikokategori</p>
                  <div>{getRiskBadge(selectedProduct.skadeProsent)}</div>
                </div>
              </div>

              {selectedProduct.skadeProsent > terskler.skadeProsent && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Anbefalinger for fornyelse:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Vurder premieøkning på {Math.min(50, Math.round((selectedProduct.skadeProsent - terskler.skadeProsent) / 2))}%</li>
                    <li>• Øk egenandel for å redusere småskader</li>
                    <li>• Gjennomgå vilkår og dekninger</li>
                    <li>• Vurder risikoreduserende tiltak</li>
                  </ul>
                </div>
              )}

              {selectedProduct.skadeProsent < 30 && selectedProduct.opptjentPremie > 100000 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Muligheter:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Utmerket lønnsomhet - vurder utvidelse av dekning</li>
                    <li>• Potensiell kandidat for preferanseprising</li>
                    <li>• Mulighet for cross-selling av relaterte produkter</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Produktstatistikk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowHighRiskProducts(!showHighRiskProducts)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {høyrisikoProduker.length}
                </p>
                <p className="text-xs text-muted-foreground">Høyrisiko produkter (klikk for detaljer)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowActiveClaimProducts(!showActiveClaimProducts)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {produkterMedAktiveSkader}
                </p>
                <p className="text-xs text-muted-foreground">Produkter med aktive skader (klikk for detaljer)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                {mestProblematiskeProdukt ? (
                  <>
                    <p className="text-lg font-bold text-purple-600 leading-tight">
                      {mestProblematiskeProdukt.produktNavn.length > 35
                        ? mestProblematiskeProdukt.produktNavn.substring(0, 35) + '...'
                        : mestProblematiskeProdukt.produktNavn
                      }
                    </p>
                    <p className="text-sm font-medium text-purple-600">
                      Frekvens: {formatNumber(mestProblematiskeProdukt.skadefrekvens, 1)}/år • Snitt: {formatCurrency(mestProblematiskeProdukt.avgSkadekostnad)}
                    </p>
                    <p className="text-xs text-muted-foreground">Mest problematiske produkt</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">Mest problematiske produkt</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utvidbare seksjoner */}
      {showHighRiskProducts && høyrisikoProduker.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Høyrisiko produkter (>{terskler.skadeProsent}% skadeprosent)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {høyrisikoProduker.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{product.produktNavn}</p>
                    <p className="text-sm text-muted-foreground">Kode: {product.produktKode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatPercent(product.skadeProsent)}</p>
                    <p className="text-sm text-muted-foreground">{formatNumber(product.antallSkader)} skader</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showActiveClaimProducts && produkterMedAktiveSkaderListe.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Produkter med aktive skader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {produkterMedAktiveSkaderListe.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{product.navn}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{formatNumber(product.antallÅpneSkader)} åpne skader</p>
                    <p className="text-sm text-muted-foreground">Reservert: {formatCurrency(product.totalReservert)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {høyrisikoProduker.length > 0 && !showHighRiskProducts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{høyrisikoProduker.length} produkter</strong> har skadeprosent over {terskler.skadeProsent}% og krever oppmerksomhet ved fornyelse.
          </AlertDescription>
        </Alert>
      )}

      {/* Produkttabell */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Produktoversikt ({filteredAndSortedProducts.length} produkter)
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={sortBy === 'skadeProsent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('skadeProsent')}
              >
                Skadeprosent {getSortIcon('skadeProsent')}
              </Button>
              <Button
                variant={sortBy === 'opptjentPremie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('opptjentPremie')}
              >
                Premie {getSortIcon('opptjentPremie')}
              </Button>
              <Button
                variant={sortBy === 'antallSkader' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('antallSkader')}
              >
                Antall skader {getSortIcon('antallSkader')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('produktNavn')}>
                      Produkt {getSortIcon('produktNavn')}
                    </Button>
                  </th>
                  <th className="text-right p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('opptjentPremie')}>
                      Opptjent premie {getSortIcon('opptjentPremie')}
                    </Button>
                  </th>
                  <th className="text-right p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('skadebeløp')}>
                      Skadebeløp {getSortIcon('skadebeløp')}
                    </Button>
                  </th>
                  <th className="text-right p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('skadeProsent')}>
                      Skadeprosent {getSortIcon('skadeProsent')}
                    </Button>
                  </th>
                  <th className="text-right p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('antallSkader')}>
                      Antall skader {getSortIcon('antallSkader')}
                    </Button>
                  </th>
                  <th className="text-right p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('skaderPerÅr')}>
                      Skader/år {getSortIcon('skaderPerÅr')}
                    </Button>
                  </th>
                  <th className="text-center p-3">Risiko</th>
                  <th className="text-center p-3">Handling</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProducts.map((product, index) => (
                  <tr
                    key={index}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className="p-3">
                      <p className="font-medium">{product.produktNavn}</p>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency(product.opptjentPremie)}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(product.skadebeløp)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-8 bg-gray-200 rounded-full h-1.5">
                          {product.skadeProsent > 0 && (
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, product.skadeProsent)}%`,
                                backgroundColor: getRiskColor(product.skadeProsent)
                              }}
                            />
                          )}
                        </div>
                        <span className={`font-medium ${product.skadeProsent > terskler.skadeProsent ? 'text-red-600' :
                          product.skadeProsent > 50 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                          {formatPercent(product.skadeProsent)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {formatNumber(product.antallSkader)}
                    </td>
                    <td className="p-3 text-right">
                      {product.skaderPerÅr?.toFixed(1) || '0.0'}
                    </td>
                    <td className="p-3 text-center">
                      {getRiskBadge(product.skadeProsent)}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default ProduktAnalyse;
