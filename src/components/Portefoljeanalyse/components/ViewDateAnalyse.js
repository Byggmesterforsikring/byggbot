import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { VIEWDATE_RULES, EARNED_PREMIUM_RULES } from '../utils/portfolioBusinessRules';
import { Clock, AlertTriangle, Calendar, Info } from 'lucide-react';

const ViewDateAnalyse = ({ portefoljeData }) => {
    const [viewDate, setViewDate] = useState('2025-01-02');
    const [showLogikk, setShowLogikk] = useState(false);

    return (
        <div className="space-y-6">
            {/* ViewDate-konfigurasjon */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        ViewDate-konfigurasjon
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-indigo-600" />
                            <span className="font-medium text-indigo-800">Avansert tidsreise-analyse</span>
                        </div>
                        <p className="text-sm text-indigo-700">
                            Gjenskaper porteføljetilstand på en historisk dato ved å rekonstruere
                            hvilke policy-versjoner som var aktive og deres faktiske status på det tidspunktet.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="viewDate" className="text-sm font-medium">
                                ViewDate (YYYY-MM-DD):
                            </Label>
                            <Input
                                id="viewDate"
                                type="date"
                                value={viewDate}
                                onChange={(e) => setViewDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                onClick={() => setShowLogikk(!showLogikk)}
                                variant="outline"
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                                <Info className="h-4 w-4 mr-2" />
                                {showLogikk ? 'Skjul' : 'Vis'} tidsreise-logikk
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tidsreise-logikk forklaring */}
            {showLogikk && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-600" />
                            Tidsreise-algoritme (fra Python-prosjekt)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 6 hovedsteg */}
                        <div>
                            <h4 className="font-medium mb-3">Hovedsteg for historisk rekonstruksjon:</h4>
                            <div className="space-y-2">
                                {Object.entries(VIEWDATE_RULES.TIDSREISE_STEG).map(([steg, beskrivelse]) => (
                                    <div key={steg} className="flex gap-3 text-sm">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                            {steg}
                                        </span>
                                        <span>{beskrivelse}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status-rekonstruksjon */}
                        <div>
                            <h4 className="font-medium mb-3">Historisk status-rekonstruksjon:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(VIEWDATE_RULES.HISTORISK_STATUS_LOGIKK).map(([status, info]) => (
                                    <div key={status} className="bg-gray-50 p-3 rounded border">
                                        <h5 className="font-medium text-sm mb-1">{status}:</h5>
                                        <p className="text-xs text-gray-600 mb-1">{info.regel}</p>
                                        <p className="text-xs text-gray-500">{info.beskrivelse}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Opptjent premie-logikk */}
                        <div>
                            <h4 className="font-medium mb-3">Opptjent premie-beregning:</h4>
                            <div className="bg-green-50 p-3 rounded border border-green-200">
                                {Object.entries(EARNED_PREMIUM_RULES.OPPTJENT_PREMIE_LOGIKK).map(([status, regel]) => (
                                    <div key={status} className="text-sm mb-1">
                                        <strong>{status}:</strong> {regel}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ViewDate-analyse placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        ViewDate-analyse for {viewDate}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-8 border-2 border-dashed border-indigo-200 rounded-lg text-center">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-indigo-400" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">Implementering kommer</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Kompleks 6-stegs algoritme for historisk portefølje-rekonstruksjon
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>• Filtrer policies produsert før {viewDate}</p>
                            <p>• Rekonstruer historisk status per policy-versjon</p>
                            <p>• Beregn opptjent premie på ViewDate</p>
                            <p>• Sammenlign med andre ViewDate-perioder</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ViewDateAnalyse;
