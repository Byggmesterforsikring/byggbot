import React from 'react';
import {
    X,
    Eye,
    Calendar,
    Car,
    AlertTriangle,
    DollarSign,
    CreditCard,
    TrendingDown,
    Minus,
    User,
    FileText,
    Shield,
    Clock,
    CheckCircle,
    Building
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { formatCurrency } from '../utils/dataProcessing';

const SkadeDetailModal = ({ skade, isOpen, onClose }) => {
    if (!isOpen || !skade) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Skade #{skade.skadeNummer}</h2>
                            <p className="text-sm text-gray-600">{skade.skadeType || 'Skadedetaljer'}</p>
                        </div>
                        <Badge variant={skade.åpen === 1 ? 'destructive' : 'default'}>
                            {skade.status}
                        </Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-10 w-10 p-0 hover:bg-white/50"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Hovedinformasjon med ikoner */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm text-gray-600">Skadedato</p>
                                <p className="font-semibold text-gray-900">{skade.skadeDato?.toLocaleDateString('nb-NO') || 'Ikke angitt'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Clock className="h-5 w-5 text-orange-600" />
                            <div>
                                <p className="text-sm text-gray-600">Meldt dato</p>
                                <p className="font-semibold text-gray-900">{skade.meldtDato?.toLocaleDateString('nb-NO') || 'Ikke angitt'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="text-sm text-gray-600">Avsluttet dato</p>
                                <p className="font-semibold text-gray-900">{skade.avsluttetDato?.toLocaleDateString('nb-NO') || 'Ikke avsluttet'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Shield className="h-5 w-5 text-purple-600" />
                            <div>
                                <p className="text-sm text-gray-600">Produkttype</p>
                                <p className="font-semibold text-gray-900">{skade.produktNavn}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="text-sm text-gray-600">Skadetype</p>
                                <p className="font-semibold text-gray-900">{skade.skadeType || 'Ikke angitt'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Car className="h-5 w-5 text-indigo-600" />
                            <div>
                                <p className="text-sm text-gray-600">Registreringsnummer</p>
                                <p className="font-semibold font-mono text-gray-900">{skade.registreringsNummer || 'Ikke angitt'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Økonomi med ikoner og kort-layout */}
                    <div className="border-t pt-8 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <DollarSign className="h-6 w-6 text-green-600" />
                            <h3 className="text-xl font-bold text-gray-900">Økonomi</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    <p className="text-sm font-medium text-green-700">Utbetalt</p>
                                </div>
                                <p className="text-2xl font-bold text-green-800">{formatCurrency(skade.utbetalt)}</p>
                            </div>

                            <div className={`rounded-lg p-4 ${skade.reservert < 0
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-yellow-50 border border-yellow-200'
                                }`}>
                                <div className="flex items-center gap-3 mb-2">
                                    {skade.reservert < 0 ? (
                                        <TrendingDown className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <Clock className="h-5 w-5 text-yellow-600" />
                                    )}
                                    <p className={`text-sm font-medium ${skade.reservert < 0
                                        ? 'text-blue-700'
                                        : 'text-yellow-700'
                                        }`}>
                                        {skade.reservert < 0 ? 'Forventet regress' : 'Reservert'}
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold ${skade.reservert < 0
                                    ? 'text-blue-800'
                                    : 'text-yellow-800'
                                    }`}>
                                    {formatCurrency(skade.reservert)}
                                </p>
                                {skade.reservert < 0 && (
                                    <p className="text-xs text-blue-600 mt-1">Sendt til regress</p>
                                )}
                            </div>

                            {skade.regress !== 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <TrendingDown className="h-5 w-5 text-green-600" />
                                        <p className="text-sm font-medium text-green-700">Mottatt regress</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-800">{formatCurrency(skade.regress)}</p>
                                    <p className="text-xs text-green-600 mt-1">Faktisk inngang</p>
                                </div>
                            )}

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Minus className="h-5 w-5 text-red-600" />
                                    <p className="text-sm font-medium text-red-700">Netto kostnad</p>
                                </div>
                                <p className="text-2xl font-bold text-red-800">{formatCurrency(skade.totalKostnad)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Skadekoder med ikoner */}
                    <div className="border-t pt-8 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <FileText className="h-6 w-6 text-purple-600" />
                            <h3 className="text-xl font-bold text-gray-900">Skadekoder</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                                    <p className="text-sm font-medium text-purple-700">Nivå 1</p>
                                </div>
                                <p className="font-semibold text-purple-900">{skade.skadekoder?.nivå1 || 'Ikke angitt'}</p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                                    <p className="text-sm font-medium text-purple-700">Nivå 2</p>
                                </div>
                                <p className="font-semibold text-purple-900">{skade.skadekoder?.nivå2 || 'Ikke angitt'}</p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                                    <p className="text-sm font-medium text-purple-700">Nivå 3</p>
                                </div>
                                <p className="font-semibold text-purple-900">{skade.skadekoder?.nivå3 || 'Ikke angitt'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Saksbehandling med ikoner */}
                    <div className="border-t pt-8">
                        <div className="flex items-center gap-2 mb-6">
                            <User className="h-6 w-6 text-indigo-600" />
                            <h3 className="text-xl font-bold text-gray-900">Saksbehandling</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <User className="h-5 w-5 text-indigo-600" />
                                    <p className="text-sm font-medium text-indigo-700">Saksbehandler</p>
                                </div>
                                <p className="font-semibold text-indigo-900">{skade.saksbehandler || 'Ikke angitt'}</p>
                            </div>
                            {skade.uwÅr && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Building className="h-5 w-5 text-indigo-600" />
                                        <p className="text-sm font-medium text-indigo-700">UW-år</p>
                                    </div>
                                    <p className="font-semibold text-indigo-900">{skade.uwÅr}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t bg-gray-50 p-6 flex justify-end">
                    <Button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Lukk
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SkadeDetailModal;
