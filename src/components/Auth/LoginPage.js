import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { keyframes } from '@mui/system';
import authManager from '../../auth/AuthManager';

// Microsoft logo som SVG-komponent
const MicrosoftLogo = () => (
    <svg width="16" height="16" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
);

// Animasjoner
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const dropIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  60% {
    opacity: 1;
    transform: translateY(0);
  }
  80% {
    opacity: 1;
    transform: translateY(2px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Legg til nye animasjoner
const float = keyframes`
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
  25% {
    transform: translate(10px, -10px) rotate(45deg) scale(1.1);
  }
  50% {
    transform: translate(0, -20px) rotate(90deg) scale(1);
  }
  75% {
    transform: translate(-10px, -10px) rotate(45deg) scale(0.95);
  }
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
`;

// Legg til blink animasjon
const blink = keyframes`
  0%, 35%, 45%, 50%, 60%, 100% {
    transform: scaleY(1);
  }
  37.5%, 42.5%, 52.5%, 57.5% {
    transform: scaleY(0.05);
  }
`;

// Legg til rotasjonsanimasjon
const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(90deg);
  }
`;

// Legg til kran-animasjoner
const craneWire = keyframes`
  0% {
    height: 100px;
  }
  50% {
    height: 160px;
  }
  100% {
    height: 100px;
  }
`;

const craneBrick = keyframes`
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-5deg);
  }
  75% {
    transform: rotate(5deg);
  }
  100% {
    transform: rotate(0deg);
  }
`;

// Murstein-komponent
const Brick = ({ row, column, delay }) => (
    <Box
        sx={{
            position: 'absolute',
            bottom: `calc(${row} * 30px)`,
            right: `calc(${column} * 60px + ${row % 2 ? '30px' : '0px'} - 30px)`,
            width: '55px',
            height: '25px',
            backgroundColor: '#EEEEEE',
            opacity: 0,
            animation: `${dropIn} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s forwards`,
            borderRadius: '2px',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#EEEEEE',
                opacity: 0.05,
                borderRadius: '2px'
            }
        }}
    />
);

// Murvegg-komponent
const BrickWall = () => {
    const rows = 5;
    const bricksPerRow = 15;
    const bricks = [];

    for (let row = 0; row < rows; row++) {
        const isOddRow = row % 2 === 1;
        const skipFromLeft = row;
        const startCol = isOddRow ? skipFromLeft : skipFromLeft;
        const actualBricksInRow = bricksPerRow - skipFromLeft;

        for (let col = 0; col < actualBricksInRow; col++) {
            const baseDelay = row * 0.3;
            const colDelay = col * 0.04;
            const randomDelay = Math.random() * 0.02;
            const delay = baseDelay + colDelay + randomDelay;

            bricks.push(
                <Brick
                    key={`${row}-${col}`}
                    row={row}
                    column={col}
                    delay={delay}
                />
            );
        }
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '60vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 1,
                overflow: 'hidden'
            }}
        >
            {bricks}
        </Box>
    );
};

// Bakgrunnsikoner som SVG-komponenter
const BackgroundIcons = () => (
    <>
        {/* Hus */}
        <Box sx={{
            position: 'fixed',
            top: '15%',
            right: '40%',
            opacity: 0.06,
            animation: `${float} 12s ease-in-out infinite`,
            svg: { width: '60px', height: '60px' }
        }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L4 9v12h16V9l-8-6zm0 2.7L18 11v8H6v-8l6-5.3z" />
                <path d="M10 14h4v5h-4z" />
            </svg>
        </Box>

        {/* Lastebil */}
        <Box sx={{
            position: 'fixed',
            top: '75%',
            left: '15%',
            opacity: 0.04,
            animation: `${float} 15s ease-in-out infinite`,
            svg: { width: '80px', height: '80px' }
        }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3zM3 6v9h.76c.55-.61 1.35-1 2.24-1s1.69.39 2.24 1h7.53c.55-.61 1.34-1 2.23-1 .89 0 1.69.39 2.24 1H21V8h-3V6zm0 4v-2h12v2H3v-2zm0 4v-2h12v2H3v-2z" />
            </svg>
        </Box>

        {/* Skrujern */}
        <Box sx={{
            position: 'fixed',
            top: '35%',
            right: '25%',
            opacity: 0.05,
            animation: `${float} 16s ease-in-out infinite`,
            svg: { width: '60px', height: '60px' }
        }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 2h12v6h-2l-1 11h-6l-1-11H6V2zm2 2v2h8V4H8zm1 4h6l-0.8 9h-4.4L9 8z" />
                <rect x="8" y="3" width="8" height="3" fill="#f5f5f5" />
            </svg>
        </Box>

        {/* Verktøy */}
        <Box sx={{
            position: 'fixed',
            top: '25%',
            left: '35%',
            opacity: 0.05,
            animation: `${float} 18s ease-in-out infinite`,
            svg: { width: '50px', height: '50px' }
        }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
            </svg>
        </Box>

        {/* Sikkerhets hjelm */}
        <Box sx={{
            position: 'fixed',
            top: '55%',
            right: '35%',
            opacity: 0.05,
            animation: `${float} 20s ease-in-out infinite`,
            svg: { width: '55px', height: '55px' }
        }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.38-2.85 8.51-7 9.79-4.15-1.28-7-5.41-7-9.79V6.3l7-3.12z" />
            </svg>
        </Box>

        {/* Stige */}
        <Box sx={{
            position: 'fixed',
            top: '20%',
            left: '20%',
            opacity: 0.04,
            animation: `${float} 22s ease-in-out infinite`,
            svg: { width: '70px', height: '70px' }
        }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 3v18h8V3H8zm1 2h6v2H9V5zm0 4h6v2H9V9zm0 4h6v2H9v-2zm0 4h6v2H9v-2z" />
            </svg>
        </Box>

        {/* Malerull */}
        <Box sx={{
            position: 'fixed',
            top: '45%',
            left: '25%',
            opacity: 0.05,
            animation: `${float} 19s ease-in-out infinite`,
            svg: { width: '65px', height: '65px' }
        }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 4V3c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V6h1v4H9v11c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-9h8V4h-3z" />
            </svg>
        </Box>

        {/* Vater */}
        <Box sx={{
            position: 'fixed',
            top: '65%',
            left: '30%',
            opacity: 0.04,
            animation: `${float} 17s ease-in-out infinite`,
            svg: { width: '100px', height: '35px' }
        }}>
            <svg viewBox="0 0 100 35" fill="currentColor">
                <rect x="2" y="5" width="96" height="25" rx="2" />
                <rect x="6" y="9" width="88" height="17" fill="#f5f5f5" rx="1" />
                <circle cx="50" cy="17.5" r="6" fill="currentColor" />
            </svg>
        </Box>
    </>
);

// ByggBot logo som SVG-komponent
const ByggBotLogo = () => (
    <Box sx={{
        width: '300px',
        height: '240px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        '& rect.blink': {
            animation: `${blink} 3s ease-in-out`,
            animationDelay: '0.5s',
            transformOrigin: 'center'
        },
        '& svg.logo': {
            animation: `${rotate} 1.5s cubic-bezier(0.65, 0, 0.35, 1)`,
            animationDelay: '4s',
            animationFillMode: 'forwards'
        }
    }}>
        <svg className="logo" width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="50" y="40" width="120" height="120" fill="#333333" rx="8" />
            <rect
                className="blink"
                x="80"
                y="60"
                width="25"
                height="80"
                fill="#FFB900"
            />
            <rect
                className="blink"
                x="115"
                y="60"
                width="25"
                height="80"
                fill="#FFB900"
            />
        </svg>
        <svg width="300" height="80" viewBox="0 0 300 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text
                x="150"
                y="50"
                textAnchor="middle"
                fill="#333333"
                style={{
                    fontFamily: 'Arial Black, sans-serif',
                    fontSize: '38px',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    opacity: '0.1'
                }}
            >
                BYGGBOT
            </text>
        </svg>
    </Box>
);

// Bruk en mer pålitelig måte å sjekke miljøet
const isDev = window.electron?.env?.NODE_ENV === 'development';

// Enkel devlog funksjon for bedre debugging
const devlog = (message, data = null) => {
    if (isDev) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] LoginPage: ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
};

const LoginPage = ({ setIsAuthenticated }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async () => {
        devlog('Starter login-prosess');
        setIsLoading(true);
        setError(null);

        try {
            const loginSuccess = await authManager.login();
            devlog('Login resultat fra authManager.login()', { loginSuccess });

            if (loginSuccess) {
                devlog('authManager.isAuthenticated() etter login:', authManager.isAuthenticated());
                const userDetails = authManager.getCurrentUserDetails();
                devlog('Brukerdetaljer etter login:', userDetails);

                if (setIsAuthenticated) {
                    setIsAuthenticated(true);
                    devlog('setIsAuthenticated(true) kalt.');
                } else {
                    devlog('setIsAuthenticated prop mangler på LoginPage.');
                }

                devlog('Navigerer til dashboard etter vellykket login og brukerverifisering.');
                navigate('/', { replace: true });
            } else {
                devlog('authManager.login() returnerte false. Innlogging feilet (bruker ikke funnet i UserV2 eller MSAL feil).');
                setError('Innlogging feilet. Bruker ikke funnet eller ugyldig pålogging.');
            }
        } catch (err) {
            devlog('Fundamental login feil', { error: err.message, stack: err.stack });
            setError('En uventet feil oppstod under innlogging.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#f8f8f8'
            }}
        >
            <BackgroundIcons />
            <BrickWall />

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    mb: 2,
                    position: 'relative',
                    zIndex: 2
                }}
            >
                <Box
                    sx={{
                        display: 'inline-block',
                        padding: '20px',
                        paddingBottom: '30px'
                    }}
                >
                    <ByggBotLogo />
                </Box>
            </Box>

            <Box
                sx={{
                    animation: `${fadeIn} 0.8s ease-out 0.6s both`,
                    width: '90%',
                    maxWidth: '320px',
                    position: 'relative',
                    zIndex: 2
                }}
            >
                <Button
                    variant="contained"
                    onClick={handleLogin}
                    disabled={isLoading}
                    fullWidth
                    sx={{
                        py: 1.5,
                        backgroundColor: '#ffffff',
                        color: '#7747DC',
                        textTransform: 'none',
                        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                        fontSize: '1rem',
                        fontWeight: 500,
                        borderRadius: '12px',
                        transition: 'all 0.2s ease-in-out',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        '&:hover': {
                            backgroundColor: '#f8f8f8',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        },
                        '&:active': {
                            transform: 'translateY(1px)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }
                    }}
                >
                    {isLoading ? (
                        <CircularProgress size={24} sx={{ color: '#7747DC' }} />
                    ) : (
                        <>
                            <MicrosoftLogo />
                            Logg inn med Microsoft
                        </>
                    )}
                </Button>
            </Box>

            {error && (
                <Typography
                    color="error"
                    sx={{
                        mt: 2,
                        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                        animation: `${fadeIn} 0.3s ease-out`,
                        position: 'relative',
                        zIndex: 2
                    }}
                >
                    {error}
                </Typography>
            )}
        </Box>
    );
};

export default LoginPage; 