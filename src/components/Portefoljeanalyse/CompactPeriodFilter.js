import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    X,
    Package,
    Users,
    Building2,
    User
} from 'lucide-react';

const CompactPeriodFilter = ({ portefoljeData, reportType = 'claims', onFilterChange }) => {
    const [selectedPeriods, setSelectedPeriods] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedCovers, setSelectedCovers] = useState([]);
    const [selectedInsurers, setSelectedInsurers] = useState([]);
    const [selectedCustomerType, setSelectedCustomerType] = useState('alle'); // 'alle', 'privat', 'bedrift'
    const [showQuarters, setShowQuarters] = useState(false);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [showCoverDropdown, setShowCoverDropdown] = useState(false);
    const [showInsurerDropdown, setShowInsurerDropdown] = useState(false);

    // Finn tilgjengelige år automatisk
    const availableYears = useMemo(() => {
        if (!portefoljeData?.customers) return [];

        const years = new Set();
        portefoljeData.customers.forEach(customer => {
            customer.PolicyList?.forEach(policy => {
                if (policy.InceptionDate) {
                    years.add(new Date(policy.InceptionDate).getFullYear());
                }
                policy.PolicyProduct?.forEach(product => {
                    if (product.InceptionDate) {
                        years.add(new Date(product.InceptionDate).getFullYear());
                    }
                });
            });
        });

        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [portefoljeData?.customers]);

    // Finn tilgjengelige produkter (avhenger av rapport-type)
    const availableProducts = useMemo(() => {
        if (reportType === 'claims') {
            // Hent fra skadedata
            if (!portefoljeData?.claimData?.SkadeDetaljer) return [];
            const products = new Set();
            portefoljeData.claimData.SkadeDetaljer.forEach(skade => {
                if (skade.Produktnavn) {
                    products.add(skade.Produktnavn);
                }
            });
            return Array.from(products).sort();
        } else {
            // Hent fra customer policies
            if (!portefoljeData?.customers) return [];
            const products = new Set();
            portefoljeData.customers.forEach(customer => {
                customer.PolicyList?.forEach(policy => {
                    policy.PolicyProduct?.forEach(product => {
                        if (product.ProductName) {
                            products.add(product.ProductName);
                        }
                    });
                });
            });
            return Array.from(products).sort();
        }
    }, [portefoljeData, reportType]);

    // Finn tilgjengelige dekninger (kun for portfolio, avhenger av valgte produkter)
    const availableCovers = useMemo(() => {
        if (reportType !== 'portfolio' || !portefoljeData?.customers) return [];

        const covers = new Set();
        portefoljeData.customers.forEach(customer => {
            customer.PolicyList?.forEach(policy => {
                policy.PolicyProduct?.forEach(product => {
                    // Hvis produkter er valgt, filtrer på dem
                    if (selectedProducts.length === 0 || selectedProducts.includes(product.ProductName)) {
                        product.PolicyCover?.forEach(cover => {
                            if (cover.Cover) {
                                covers.add(cover.Cover);
                            }
                        });
                    }
                });
            });
        });

        return Array.from(covers).sort();
    }, [portefoljeData, reportType, selectedProducts]);

    // Finn tilgjengelige forsikringsselskap (kun for portfolio)
    const availableInsurers = useMemo(() => {
        if (reportType !== 'portfolio' || !portefoljeData?.customers) return [];

        const insurers = new Set();
        portefoljeData.customers.forEach(customer => {
            customer.PolicyList?.forEach(policy => {
                policy.PolicyProduct?.forEach(product => {
                    // Filtrer på valgte produkter hvis noen er valgt
                    if (selectedProducts.length === 0 || selectedProducts.includes(product.ProductName)) {
                        product.PolicyCover?.forEach(cover => {
                            // Filtrer på valgte dekninger hvis noen er valgt
                            if (selectedCovers.length === 0 || selectedCovers.includes(cover.Cover)) {
                                if (cover.Insurer) {
                                    insurers.add(cover.Insurer);
                                }
                            }
                        });
                    }
                });
            });
        });

        return Array.from(insurers).sort();
    }, [portefoljeData, reportType, selectedProducts, selectedCovers]);

    // Sjekk om periode er tilgjengelig (ikke fremtidig)
    const isPeriodAvailable = (periodId) => {
        const now = new Date();
        const norskTid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
        const currentYear = norskTid.getFullYear();
        const currentQuarter = Math.floor((norskTid.getMonth() + 3) / 3);

        // Hurtigvalg er alltid tilgjengelig
        if (['alle', 'siste12', 'iaar'].includes(periodId)) {
            return true;
        }

        // År er tilgjengelig hvis det er <= inneværende år
        if (!periodId.includes('-')) {
            return parseInt(periodId) <= currentYear;
        }

        // Kvartaler
        if (periodId.includes('-')) {
            const [quarter, year] = periodId.split('-');
            const qNum = parseInt(quarter.substring(1)); // q1 -> 1
            const yearNum = parseInt(year);

            // Tidligere år: alle kvartaler tilgjengelig
            if (yearNum < currentYear) {
                return true;
            }

            // Inneværende år: kun kvartaler som er ferdige
            if (yearNum === currentYear) {
                return qNum < currentQuarter;
            }

            // Fremtidige år: ikke tilgjengelig
            return false;
        }

        return true;
    };

    // Sjekk om periode kan legges til (samme kategori)
    const canAddPeriod = (periodId) => {
        if (selectedPeriods.length === 0) {
            return isPeriodAvailable(periodId);
        }

        // Sjekk kategori-kompatibilitet
        const firstPeriod = selectedPeriods[0];

        // Hurtigvalg kan ikke blandes med andre
        if (['alle', 'siste12', 'iaar'].includes(firstPeriod) ||
            ['alle', 'siste12', 'iaar'].includes(periodId)) {
            return false;
        }

        // År kan kun sammenlignes med år
        const firstIsYear = !firstPeriod.includes('-');
        const newIsYear = !periodId.includes('-');

        if (firstIsYear && !newIsYear) {
            return false; // Kan ikke blande år og kvartal
        }
        if (!firstIsYear && newIsYear) {
            return false; // Kan ikke blande kvartal og år
        }

        return isPeriodAvailable(periodId);
    };

    // Toggle periode (legg til eller fjern)
    const togglePeriod = (periodId) => {
        const isSelected = selectedPeriods.includes(periodId);

        if (isSelected) {
            // Fjern periode
            const newPeriods = selectedPeriods.filter(p => p !== periodId);
            setSelectedPeriods(newPeriods);
            onFilterChange?.(newPeriods, selectedProducts, selectedCovers, selectedInsurers, selectedCustomerType);
        } else {
            // Legg til periode hvis kompatibel
            if (canAddPeriod(periodId)) {
                const newPeriods = [...selectedPeriods, periodId];
                setSelectedPeriods(newPeriods);
                onFilterChange?.(newPeriods, selectedProducts, selectedCovers, selectedInsurers, selectedCustomerType);
            }
        }
    };

    // Toggle produkt
    const toggleProduct = (product) => {
        const isSelected = selectedProducts.includes(product);
        let newProducts;
        let newCovers = selectedCovers;
        let newInsurers = selectedInsurers;

        if (isSelected) {
            // Fjern produkt
            newProducts = selectedProducts.filter(p => p !== product);

            // Hvis vi fjerner produkter og er i portfolio-modus, må vi også fjerne dekninger og insurers som ikke lenger er tilgjengelige
            if (reportType === 'portfolio' && newProducts.length > 0) {
                // Finn tilgjengelige dekninger og insurers for de gjenværende produktene
                const remainingCovers = new Set();
                const remainingInsurers = new Set();

                portefoljeData.customers?.forEach(customer => {
                    customer.PolicyList?.forEach(policy => {
                        policy.PolicyProduct?.forEach(prod => {
                            if (newProducts.includes(prod.ProductName)) {
                                prod.PolicyCover?.forEach(cover => {
                                    if (cover.Cover) {
                                        remainingCovers.add(cover.Cover);
                                    }
                                    if (cover.Insurer) {
                                        remainingInsurers.add(cover.Insurer);
                                    }
                                });
                            }
                        });
                    });
                });

                // Filtrer selectedCovers og selectedInsurers til kun å inkludere tilgjengelige
                newCovers = selectedCovers.filter(c => remainingCovers.has(c));
                newInsurers = selectedInsurers.filter(i => remainingInsurers.has(i));
                setSelectedCovers(newCovers);
                setSelectedInsurers(newInsurers);
            }
        } else {
            // Legg til produkt
            newProducts = [...selectedProducts, product];
        }

        setSelectedProducts(newProducts);
        onFilterChange?.(selectedPeriods, newProducts, newCovers, newInsurers, selectedCustomerType);
    };

    // Toggle dekning (kun for portfolio)
    const toggleCover = (cover) => {
        const isSelected = selectedCovers.includes(cover);
        let newCovers = isSelected
            ? selectedCovers.filter(c => c !== cover)
            : [...selectedCovers, cover];

        let newInsurers = selectedInsurers;

        // Hvis vi fjerner dekninger, må vi også fjerne insurers som ikke lenger er tilgjengelige
        if (isSelected && reportType === 'portfolio' && newCovers.length > 0) {
            const remainingInsurers = new Set();

            portefoljeData.customers?.forEach(customer => {
                customer.PolicyList?.forEach(policy => {
                    policy.PolicyProduct?.forEach(product => {
                        if (selectedProducts.length === 0 || selectedProducts.includes(product.ProductName)) {
                            product.PolicyCover?.forEach(cov => {
                                if (newCovers.includes(cov.Cover) && cov.Insurer) {
                                    remainingInsurers.add(cov.Insurer);
                                }
                            });
                        }
                    });
                });
            });

            newInsurers = selectedInsurers.filter(i => remainingInsurers.has(i));
            setSelectedInsurers(newInsurers);
        }

        setSelectedCovers(newCovers);
        onFilterChange?.(selectedPeriods, selectedProducts, newCovers, newInsurers, selectedCustomerType);
    };

    // Toggle forsikringsselskap (kun for portfolio)
    const toggleInsurer = (insurer) => {
        const isSelected = selectedInsurers.includes(insurer);
        const newInsurers = isSelected
            ? selectedInsurers.filter(i => i !== insurer)
            : [...selectedInsurers, insurer];

        setSelectedInsurers(newInsurers);
        onFilterChange?.(selectedPeriods, selectedProducts, selectedCovers, newInsurers, selectedCustomerType);
    };

    // Endre kundetype
    const changeCustomerType = (type) => {
        setSelectedCustomerType(type);
        onFilterChange?.(selectedPeriods, selectedProducts, selectedCovers, selectedInsurers, type);
    };

    const isSelected = (periodId) => selectedPeriods.includes(periodId);

    // Hent periode-label
    const getPeriodLabel = (periodId) => {
        if (periodId === 'alle') return 'Alle data';
        if (periodId === 'siste12') return 'Siste 12 mnd';
        if (periodId === 'iaar') return 'I år (2025)';
        if (periodId.includes('-')) {
            const [quarter, year] = periodId.split('-');
            return `${quarter.toUpperCase()} ${year}`;
        }
        return periodId;
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Hovedfiltre - kompakt på én linje */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 mr-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Velg periode:</span>
                        </div>

                        {/* Hurtigvalg */}
                        {['alle', 'siste12', 'iaar'].map(periodId => {
                            const selected = isSelected(periodId);
                            const canAdd = canAddPeriod(periodId);
                            const labels = {
                                'alle': 'Alle',
                                'siste12': 'Siste 12 mnd',
                                'iaar': '2025'
                            };

                            return (
                                <Button
                                    key={periodId}
                                    variant={selected ? "default" : "outline"}
                                    onClick={() => togglePeriod(periodId)}
                                    disabled={!selected && !canAdd}
                                    size="sm"
                                    className={`text-xs ${!canAdd && !selected ? "opacity-60" : ""}`}
                                >
                                    {labels[periodId]}
                                </Button>
                            );
                        })}

                        <div className="w-px h-6 bg-gray-300 mx-1"></div>

                        {/* År-valg */}
                        {availableYears.map(year => {
                            const yearId = year.toString();
                            const available = isPeriodAvailable(yearId);
                            const canAdd = canAddPeriod(yearId);
                            const selected = isSelected(yearId);

                            return (
                                <Button
                                    key={String(year)}
                                    variant={selected ? "default" : "outline"}
                                    onClick={() => togglePeriod(yearId)}
                                    disabled={!available || (!selected && !canAdd)}
                                    size="sm"
                                    className={`text-xs ${!available ? "opacity-50" : ""}`}
                                >
                                    {year}
                                </Button>
                            );
                        })}

                        <div className="w-px h-6 bg-gray-300 mx-1"></div>

                        {/* Kvartal-ekspander knapp */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQuarters(!showQuarters)}
                            className="text-xs"
                        >
                            {showQuarters ? (
                                <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Skjul kvartaler
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    Vis kvartaler
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Produkt og kundetype-filtre */}
                    <div className="pt-2 border-t flex items-center gap-4 flex-wrap">
                        {/* Kundetype-filter */}
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-700">Kundetype:</span>
                            <div className="flex gap-1">
                                <Button
                                    variant={selectedCustomerType === 'alle' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => changeCustomerType('alle')}
                                    className="text-xs"
                                >
                                    <Users className="h-3 w-3 mr-1" />
                                    Alle
                                </Button>
                                <Button
                                    variant={selectedCustomerType === 'privat' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => changeCustomerType('privat')}
                                    className="text-xs"
                                >
                                    <User className="h-3 w-3 mr-1" />
                                    Privat
                                </Button>
                                <Button
                                    variant={selectedCustomerType === 'bedrift' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => changeCustomerType('bedrift')}
                                    className="text-xs"
                                >
                                    <Building2 className="h-3 w-3 mr-1" />
                                    Bedrift
                                </Button>
                            </div>
                        </div>

                        <div className="w-px h-6 bg-gray-300"></div>

                        {/* Produkt-filter */}
                        <div className="flex items-center gap-2 relative">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">Produkter:</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowProductDropdown(!showProductDropdown)}
                                className="text-xs"
                            >
                                {selectedProducts.length > 0 ? (
                                    <>
                                        {selectedProducts.length} valgt
                                        <ChevronDown className="h-3 w-3 ml-1" />
                                    </>
                                ) : (
                                    <>
                                        Velg produkter
                                        <ChevronDown className="h-3 w-3 ml-1" />
                                    </>
                                )}
                            </Button>

                            {/* Produkt dropdown */}
                            {showProductDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto min-w-[250px]">
                                    <div className="p-2 space-y-1">
                                        {availableProducts.length === 0 ? (
                                            <div className="text-xs text-gray-500 p-2">Ingen produkter tilgjengelig</div>
                                        ) : (
                                            availableProducts.map(product => (
                                                <label
                                                    key={product}
                                                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.includes(product)}
                                                        onChange={() => toggleProduct(product)}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <span className="text-xs">{product}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    {selectedProducts.length > 0 && (
                                        <div className="border-t p-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedProducts([]);
                                                    setSelectedCovers([]);
                                                    setSelectedInsurers([]);
                                                    onFilterChange?.(selectedPeriods, [], [], [], selectedCustomerType);
                                                }}
                                                className="text-xs w-full"
                                            >
                                                Fjern alle
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Deknings-filter (kun for portfolio) */}
                        {reportType === 'portfolio' && (
                            <>
                                <div className="w-px h-6 bg-gray-300"></div>

                                <div className="flex items-center gap-2 relative">
                                    <Package className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium text-gray-700">Dekninger:</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowCoverDropdown(!showCoverDropdown)}
                                        className="text-xs"
                                        disabled={selectedProducts.length === 0}
                                    >
                                        {selectedCovers.length > 0 ? (
                                            <>
                                                {selectedCovers.length} valgt
                                                <ChevronDown className="h-3 w-3 ml-1" />
                                            </>
                                        ) : (
                                            <>
                                                {selectedProducts.length > 0 ? 'Velg dekninger' : 'Velg produkt først'}
                                                <ChevronDown className="h-3 w-3 ml-1" />
                                            </>
                                        )}
                                    </Button>

                                    {/* Deknings dropdown */}
                                    {showCoverDropdown && selectedProducts.length > 0 && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto min-w-[250px]">
                                            <div className="p-2 space-y-1">
                                                {availableCovers.length === 0 ? (
                                                    <div className="text-xs text-gray-500 p-2">Ingen dekninger tilgjengelig</div>
                                                ) : (
                                                    availableCovers.map(cover => (
                                                        <label
                                                            key={cover}
                                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCovers.includes(cover)}
                                                                onChange={() => toggleCover(cover)}
                                                                className="rounded border-gray-300"
                                                            />
                                                            <span className="text-xs">{cover}</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            {selectedCovers.length > 0 && (
                                                <div className="border-t p-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCovers([]);
                                                            setSelectedInsurers([]);
                                                            onFilterChange?.(selectedPeriods, selectedProducts, [], [], selectedCustomerType);
                                                        }}
                                                        className="text-xs w-full"
                                                    >
                                                        Fjern alle
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="w-px h-6 bg-gray-300"></div>

                                {/* Forsikringsselskap-filter */}
                                <div className="flex items-center gap-2 relative">
                                    <Building2 className="h-4 w-4 text-indigo-600" />
                                    <span className="text-sm font-medium text-gray-700">Forsikringsselskap:</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowInsurerDropdown(!showInsurerDropdown)}
                                        className="text-xs"
                                        disabled={selectedProducts.length === 0}
                                    >
                                        {selectedInsurers.length > 0 ? (
                                            <>
                                                {selectedInsurers.length} valgt
                                                <ChevronDown className="h-3 w-3 ml-1" />
                                            </>
                                        ) : (
                                            <>
                                                {selectedProducts.length > 0 ? 'Velg forsikringsselskap' : 'Velg produkt først'}
                                                <ChevronDown className="h-3 w-3 ml-1" />
                                            </>
                                        )}
                                    </Button>

                                    {/* Forsikringsselskap dropdown */}
                                    {showInsurerDropdown && selectedProducts.length > 0 && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto min-w-[250px]">
                                            <div className="p-2 space-y-1">
                                                {availableInsurers.length === 0 ? (
                                                    <div className="text-xs text-gray-500 p-2">Ingen forsikringsselskap tilgjengelig</div>
                                                ) : (
                                                    availableInsurers.map(insurer => (
                                                        <label
                                                            key={insurer}
                                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedInsurers.includes(insurer)}
                                                                onChange={() => toggleInsurer(insurer)}
                                                                className="rounded border-gray-300"
                                                            />
                                                            <span className="text-xs">{insurer}</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            {selectedInsurers.length > 0 && (
                                                <div className="border-t p-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedInsurers([]);
                                                            onFilterChange?.(selectedPeriods, selectedProducts, selectedCovers, [], selectedCustomerType);
                                                        }}
                                                        className="text-xs w-full"
                                                    >
                                                        Fjern alle
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Kvartal-velger (ekspanderbar) */}
                    {showQuarters && (
                        <div className="pt-2 border-t">
                            <div className="grid grid-cols-4 gap-4">
                                {availableYears.slice(0, 4).map(year => (
                                    <div key={String(year)} className="space-y-2">
                                        <p className="text-xs font-medium text-gray-600">{year}:</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            {['q1', 'q2', 'q3', 'q4'].map(quarter => {
                                                const periodId = `${quarter}-${year}`;
                                                const available = isPeriodAvailable(periodId);
                                                const canAdd = canAddPeriod(periodId);
                                                const selected = isSelected(periodId);

                                                return (
                                                    <Button
                                                        key={periodId}
                                                        size="sm"
                                                        variant={selected ? "default" : "outline"}
                                                        onClick={() => togglePeriod(periodId)}
                                                        disabled={!available || (!selected && !canAdd)}
                                                        className={`text-xs px-2 py-1 h-7 ${!available ? "opacity-50" : ""} ${!canAdd && !selected ? "opacity-60" : ""}`}
                                                    >
                                                        {quarter.toUpperCase()}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Valgte perioder - kompakt visning */}
                    {selectedPeriods.length > 0 && (
                        <div className="pt-2 border-t flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-600">
                                {selectedPeriods.length > 1 ? 'Sammenligner:' : 'Periode:'}
                            </span>
                            {selectedPeriods.map((period) => (
                                <Badge
                                    key={period}
                                    variant="secondary"
                                    className="flex items-center gap-1 text-xs"
                                >
                                    {getPeriodLabel(period)}
                                    <button
                                        onClick={() => togglePeriod(period)}
                                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CompactPeriodFilter;
