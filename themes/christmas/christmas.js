/*
 * Christmas Theme for Ryans Web Services
 * Festive & Fun - Subtle snowfall + drooping string lights + snow-capped buttons!
 */

(function() {
    'use strict';

    // Check if on login/signup pages
    const isAuthPage = /\/(login|signup)\.html/.test(window.location.pathname);

    const CONFIG = {
        ENABLED: true, // enable or disable the Christmas theme
        snowflakes: true,
        lights: !isAuthPage, // disable lights on login/signup
        greeting: false,
        countdown: true,
        candyCaneAccents: !isAuthPage, // disable deal button on login/signup
        festiveColors: true,
        snowflakeCount: 25,
    };

    if (!CONFIG.ENABLED) return;

    // ============================================
    // STYLES
    // ============================================
    const styles = document.createElement('style');
    styles.textContent = `
        /* Snowfall - subtle */
        @keyframes fall {
            0% { transform: translateY(-100px) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(360deg); }
        }
        
        @keyframes sway {
            0%, 100% { margin-left: 0; }
            25% { margin-left: 15px; }
            75% { margin-left: -15px; }
        }
        
        /* Lights */
        @keyframes glow1 { 0%, 100% { opacity: 1; filter: brightness(1.5); } 50% { opacity: 0.4; filter: brightness(0.9); } }
        @keyframes glow2 { 0%, 100% { opacity: 0.4; filter: brightness(0.9); } 50% { opacity: 1; filter: brightness(1.5); } }
        @keyframes glow3 { 0%, 33%, 100% { opacity: 1; } 66% { opacity: 0.4; } }
        @keyframes bulbSwing { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        
        /* Toast */
        @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { to { transform: translateY(100px); opacity: 0; } }
        
        /* Pulse glow */
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
            50% { box-shadow: 0 0 15px currentColor, 0 0 30px currentColor, 0 0 45px currentColor; }
        }
        
        /* Countdown number flip */
        @keyframes countPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        /* Snow Container */
        #xmas-snow-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            overflow: hidden;
        }
        
        .snowflake {
            position: fixed;
            top: -100px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8em;
            text-shadow: 0 0 3px rgba(255,255,255,0.5);
            pointer-events: none;
            z-index: 1;
            animation: fall linear infinite, sway ease-in-out infinite;
        }
        
        /* Ensure page content appears above snowflakes */
        .hero, .hero-content,
        section, .section,
        .card, .pricing-card, .feature-card, .service-card, .testimonial-card,
        .container,
        footer, .footer,
        .modal, .popup,
        form, .form-group, input, textarea, select,
        .stats, .stat-item,
        .features, .services, .testimonials, .pricing,
        main, article, aside,
        .contact-form, .contact-card,
        .faq, .faq-item,
        .grid, .row {
            position: relative;
            z-index: 2;
        }
        
        /* String Lights Container */
        #xmas-lights {
            position: fixed;
            top: 80px;
            left: 0;
            width: 100%;
            height: 80px;
            z-index: 9999;
            pointer-events: none;
            overflow: visible;
            transition: transform 0.4s ease, opacity 0.4s ease;
        }

        /* SVG wire */
        #xmas-lights svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }

        #xmas-lights .wire-path {
            fill: none;
            stroke: #222;
            stroke-width: 3;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
        }

        /* Individual bulb */
        .xmas-bulb {
            position: absolute;
            width: 12px;
            height: 18px;
            border-radius: 50% 50% 50% 50% / 35% 35% 65% 65%;
            transform-origin: top center;
            animation: bulbSwing 3s ease-in-out infinite;
            box-shadow: 0 0 8px currentColor, 0 0 16px currentColor, 0 0 24px currentColor;
        }
        
        /* Bulb cap/socket */
        .xmas-bulb::before {
            content: '';
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            background: linear-gradient(180deg, #555 0%, #333 100%);
            border-radius: 2px 2px 0 0;
        }
        
        .bulb-red { background: radial-gradient(circle at 30% 30%, #ff6b6b, #c0392b); color: #ff0000; }
        .bulb-green { background: radial-gradient(circle at 30% 30%, #6bff6b, #27ae60); color: #00ff00; }
        .bulb-blue { background: radial-gradient(circle at 30% 30%, #6b9fff, #2980b9); color: #0066ff; }
        .bulb-yellow { background: radial-gradient(circle at 30% 30%, #ffeb6b, #f39c12); color: #ffcc00; }
        .bulb-purple { background: radial-gradient(circle at 30% 30%, #bb6bff, #8e44ad); color: #9900ff; }
        .bulb-orange { background: radial-gradient(circle at 30% 30%, #ffb06b, #e67e22); color: #ff6600; }
        
        /* Button decorations disabled */
        
        /* Candy Cane Logo Underline */
        .logo.xmas-candy-canes {
            position: relative !important;
            padding-bottom: 8px !important;
        }
        
        .logo.xmas-candy-canes::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 6px;
            background: repeating-linear-gradient(
                45deg,
                #e74c3c 0px,
                #e74c3c 8px,
                #fff 8px,
                #fff 16px
            );
            border-radius: 3px;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
        }
        
        /* Modern Christmas Countdown - Hero Integrated */
        #xmas-countdown {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin: 24px auto 0 auto;
            padding: 20px 32px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            font-family: system-ui, -apple-system, sans-serif;
            max-width: fit-content;
        }
        
        #xmas-countdown .countdown-title {
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        #xmas-countdown .countdown-title-icon {
            font-size: 18px;
        }
        
        #xmas-countdown .countdown-timer {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        #xmas-countdown .countdown-segment {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0 14px;
        }
        
        #xmas-countdown .countdown-segment:not(:last-child) {
            border-right: 1px solid rgba(255, 255, 255, 0.15);
        }
        
        #xmas-countdown .countdown-value {
            font-size: 32px;
            font-weight: 700;
            color: #fff;
            line-height: 1;
            font-variant-numeric: tabular-nums;
            animation: countPulse 2s ease-in-out infinite;
        }
        
        #xmas-countdown .countdown-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 6px;
        }
        
        #xmas-countdown .countdown-message {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        #xmas-countdown .countdown-tree {
            font-size: 20px;
        }
        
        /* Christmas Day special */
        #xmas-countdown.christmas-day {
            background: linear-gradient(135deg, rgba(39, 174, 96, 0.3), rgba(192, 57, 43, 0.3));
            border-color: rgba(255, 255, 255, 0.3);
        }
        
        #xmas-countdown.christmas-day .countdown-message {
            font-size: 18px;
            font-weight: 600;
        }
        
        /* Festive link colors */
        .xmas-festive-links a:hover {
            color: #e74c3c !important;
            text-shadow: 0 0 8px rgba(231, 76, 60, 0.5);
        }
        
        /* Coupon Button in navbar */
        .xmas-coupon-btn {
            background: linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%);
            color: #fff;
            border: 2px solid #fff;
            border-radius: 20px;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            font-family: system-ui, -apple-system, sans-serif;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 15px rgba(192, 57, 43, 0.4), 0 0 20px rgba(231, 76, 60, 0.3);
            animation: couponPulse 2s ease-in-out infinite;
            transition: transform 0.2s, box-shadow 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: 12px;
            white-space: nowrap;
        }
        
        .xmas-coupon-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(192, 57, 43, 0.5), 0 0 30px rgba(231, 76, 60, 0.4);
        }
        
        .xmas-coupon-btn .gift-icon {
            font-size: 16px;
        }
        
        @keyframes couponPulse {
            0%, 100% { box-shadow: 0 4px 15px rgba(192, 57, 43, 0.4), 0 0 20px rgba(231, 76, 60, 0.3); }
            50% { box-shadow: 0 4px 20px rgba(192, 57, 43, 0.6), 0 0 35px rgba(231, 76, 60, 0.5); }
        }
        
        /* Coupon Popup */
        .xmas-coupon-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100002;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
        }
        
        .xmas-coupon-popup.active {
            opacity: 1;
            visibility: visible;
        }
        
        .xmas-coupon-card {
            background: linear-gradient(135deg, #1e5631 0%, #145a32 100%);
            border: 3px solid #2ecc71;
            border-radius: 20px;
            padding: 40px 50px;
            text-align: center;
            max-width: 400px;
            margin: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(46, 204, 113, 0.3);
            transform: scale(0.8);
            transition: transform 0.3s;
            position: relative;
        }
        
        .xmas-coupon-popup.active .xmas-coupon-card {
            transform: scale(1);
        }
        
        .xmas-coupon-card .close-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 30px;
            height: 30px;
            border: none;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            color: rgba(255,255,255,0.7);
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .xmas-coupon-card .close-btn:hover {
            background: rgba(255,255,255,0.2);
            color: #fff;
        }
        
        .xmas-coupon-card .gift-emoji {
            font-size: 50px;
            margin-bottom: 15px;
        }
        
        .xmas-coupon-card h3 {
            color: #fff;
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px 0;
            font-family: system-ui, -apple-system, sans-serif;
        }
        
        .xmas-coupon-card .discount-text {
            color: #2ecc71;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 20px 0;
        }
        
        .xmas-coupon-card .code-box {
            background: rgba(0,0,0,0.3);
            border: 2px dashed #2ecc71;
            border-radius: 10px;
            padding: 15px 25px;
            margin-bottom: 20px;
        }
        
        .xmas-coupon-card .code-label {
            color: rgba(255,255,255,0.7);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .xmas-coupon-card .code-value {
            color: #fff;
            font-size: 28px;
            font-weight: 800;
            font-family: monospace;
            letter-spacing: 3px;
        }
        
        .xmas-coupon-card .copy-btn {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: #fff;
            border: none;
            border-radius: 25px;
            padding: 12px 30px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .xmas-coupon-card .copy-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 20px rgba(46, 204, 113, 0.4);
        }
        
        .xmas-coupon-card .copy-btn.copied {
            background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);
        }
        
        .xmas-coupon-card .fine-print {
            color: rgba(255,255,255,0.5);
            font-size: 11px;
            margin-top: 15px;
        }
        
        /* Sparkle cursor trail */
        .xmas-sparkle {
            position: fixed;
            pointer-events: none;
            font-size: 12px;
            z-index: 100002;
        }
        
        @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
        }
        
        .xmas-sparkle {
            animation: sparkle 0.6s ease-out forwards;
        }
        
        @media (max-width: 600px) {
            #xmas-countdown { 
                gap: 4px; 
                padding: 12px 16px;
                flex-wrap: wrap;
            }
            #xmas-countdown .countdown-segment { padding: 0 8px; }
            #xmas-countdown .countdown-value { font-size: 24px; }
            #xmas-countdown .countdown-label { font-size: 9px; }
            .xmas-holly { font-size: 24px; }
            
            /* Hide holiday deal button on mobile - too intrusive */
            .xmas-coupon-btn {
                display: none !important;
            }
            
            /* Push page content down to make room for lights below the badge */
            body {
                padding-top: 60px !important;
            }
            
            /* Smaller bulbs on mobile */
            .xmas-bulb {
                width: 8px !important;
                height: 12px !important;
            }
            
            /* Make mobile nav menu cover the lights */
            .nav-links.active,
            .nav-menu.active,
            #navMenu.active,
            ul.nav-menu.active,
            ul#navMenu.active {
                z-index: 999999 !important;
            }
            
            /* Keep mobile toggle button above everything so X is clickable */
            .mobile-toggle,
            .mobile-menu-toggle,
            #mobileToggle {
                z-index: 9999999 !important;
            }
        }
        
        /* Toast - Centered Modal Style */
        .xmas-toast {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(ellipse at top, #1a2a1a 0%, #0d1810 50%, #050a07 100%);
            border: none;
            border-radius: 24px;
            padding: 40px 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
            box-shadow: 
                0 25px 80px rgba(0,0,0,0.7),
                0 0 0 1px rgba(255,255,255,0.1),
                0 0 60px rgba(192, 57, 43, 0.15),
                0 0 60px rgba(39, 174, 96, 0.15);
            z-index: 100001;
            animation: toastAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            font-family: system-ui, -apple-system, sans-serif;
            overflow: hidden;
            min-width: 320px;
            max-width: 400px;
        }
        
        @keyframes toastAppear {
            0% { 
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            100% { 
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        /* Backdrop overlay */
        .xmas-toast-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 100000;
            animation: fadeIn 0.3s ease forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* Decorative top border with glow */
        .xmas-toast::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, 
                #c0392b 0%, 
                #e74c3c 25%, 
                #f1c40f 50%, 
                #27ae60 75%, 
                #2ecc71 100%
            );
            box-shadow: 0 0 20px rgba(231, 76, 60, 0.5), 0 0 40px rgba(46, 204, 113, 0.3);
        }
        
        /* Decorative corner ornaments */
        .xmas-toast::after {
            content: '❄';
            position: absolute;
            top: 12px;
            left: 12px;
            font-size: 16px;
            opacity: 0.3;
            animation: twinkle 2s ease-in-out infinite;
        }
        
        @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        .xmas-toast-icon {
            font-size: 56px;
            margin-bottom: 4px;
            animation: gentleFloat 3s ease-in-out infinite;
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
        }
        
        @keyframes gentleFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }
        
        .xmas-toast-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        
        .xmas-toast h4 {
            color: #fff;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 0.5px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        
        .xmas-toast p {
            color: rgba(255,255,255,0.75);
            font-size: 15px;
            margin: 0;
            line-height: 1.5;
        }
        
        .xmas-toast p::before {
            content: none;
        }
        
        /* Decorative divider */
        .xmas-toast-divider {
            width: 60px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            margin: 4px 0;
        }
        
        /* Ornament decorations */
        .xmas-toast-ornaments {
            display: flex;
            gap: 12px;
            margin-top: 8px;
            font-size: 20px;
            opacity: 0.8;
        }
        
        .xmas-toast-close {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 32px;
            height: 32px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.08);
            border-radius: 50%;
            color: rgba(255,255,255,0.7);
            cursor: pointer;
            font-size: 18px;
            font-weight: 400;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        
        .xmas-toast-close:hover {
            background: rgba(192, 57, 43, 0.4);
            border-color: rgba(192, 57, 43, 0.6);
            color: #fff;
            transform: scale(1.1);
        }
        
        .xmas-toast-close:active {
            transform: scale(0.95);
        }
        
        @media (max-width: 600px) {
            .xmas-toast { 
                left: 20px;
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
                min-width: auto;
                max-width: none;
                padding: 32px 40px;
            }
            .xmas-toast-icon {
                font-size: 48px;
            }
            .xmas-toast h4 {
                font-size: 20px;
            }
            .xmas-toast p {
                font-size: 14px;
            }
        }
        
        @keyframes slideDown {
            to { 
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
    `;
    document.head.appendChild(styles);

    // ============================================
    // FALLING SNOW (subtle)
    // ============================================
    if (CONFIG.snowflakes) {
        const container = document.createElement('div');
        container.id = 'xmas-snow-container';
        document.body.appendChild(container);
        
        const snowChars = ['❄', '❅', '•'];
        
        function createSnowflake() {
            const snow = document.createElement('div');
            snow.className = 'snowflake';
            snow.textContent = snowChars[Math.floor(Math.random() * snowChars.length)];
            
            const size = Math.random() * 1 + 0.4;
            const left = Math.random() * 100;
            const fallDuration = Math.random() * 15 + 15;
            const swayDuration = Math.random() * 4 + 3;
            const delay = Math.random() * -20;
            const opacity = Math.random() * 0.4 + 0.2;
            
            snow.style.cssText = `
                left: ${left}vw;
                font-size: ${size}em;
                opacity: ${opacity};
                animation: fall ${fallDuration}s linear ${delay}s infinite, sway ${swayDuration}s ease-in-out ${delay}s infinite;
            `;
            
            container.appendChild(snow);
        }
        
        for (let i = 0; i < CONFIG.snowflakeCount; i++) {
            createSnowflake();
        }
    }

    // ============================================
    // DROOPING STRING LIGHTS
    // ============================================
    if (CONFIG.lights) {
        const lightsContainer = document.createElement('div');
        lightsContainer.id = 'xmas-lights';
        
        const width = window.innerWidth;
        const colors = ['bulb-red', 'bulb-green', 'bulb-blue', 'bulb-yellow', 'bulb-purple', 'bulb-orange'];
        
        const swoopWidth = 120;
        const swoopCount = Math.ceil(width / swoopWidth) + 1;
        const droopDepth = 35;
        
        let pathD = 'M 0,5 ';
        const bulbPositions = [];
        
        for (let i = 0; i < swoopCount; i++) {
            const startX = i * swoopWidth;
            const midX = startX + swoopWidth / 2;
            const endX = startX + swoopWidth;
            
            pathD += `Q ${midX},${droopDepth + 5} ${endX},5 `;
            
            bulbPositions.push({ x: midX, y: droopDepth + 2, isLow: true });
            bulbPositions.push({ x: startX + swoopWidth * 0.25, y: droopDepth * 0.5 + 3, isLow: false });
            bulbPositions.push({ x: startX + swoopWidth * 0.75, y: droopDepth * 0.5 + 3, isLow: false });
        }
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} 80`);
        svg.setAttribute('preserveAspectRatio', 'none');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('class', 'wire-path');
        svg.appendChild(path);
        
        lightsContainer.appendChild(svg);
        
        bulbPositions.forEach((pos, i) => {
            if (pos.x > width + 20) return;
            
            const bulb = document.createElement('div');
            bulb.className = 'xmas-bulb ' + colors[i % colors.length];
            bulb.style.left = (pos.x - 6) + 'px';
            bulb.style.top = (pos.y) + 'px';
            bulb.style.animationDelay = (i * 0.15) + 's';
            
            const glowAnim = ['glow1', 'glow2', 'glow3'][i % 3];
            const glowDuration = (1.5 + (i % 3) * 0.5) + 's';
            bulb.style.animation = `bulbSwing 3s ease-in-out infinite, ${glowAnim} ${glowDuration} ease-in-out infinite`;
            bulb.style.animationDelay = `${(i * 0.15)}s, ${(i * 0.2)}s`;
            
            lightsContainer.appendChild(bulb);
        });
        
        document.body.appendChild(lightsContainer);
        
        // Handle resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Always find and remove existing lights by ID (not by reference)
                const existingLights = document.getElementById('xmas-lights');
                if (existingLights) {
                    existingLights.remove();
                }
                
                if (CONFIG.lights) {
                    const newWidth = window.innerWidth;
                    const newLightsContainer = document.createElement('div');
                    newLightsContainer.id = 'xmas-lights';
                    
                    const newSwoopCount = Math.ceil(newWidth / swoopWidth) + 1;
                    let newPathD = 'M 0,5 ';
                    const newBulbPositions = [];
                    
                    for (let i = 0; i < newSwoopCount; i++) {
                        const startX = i * swoopWidth;
                        const midX = startX + swoopWidth / 2;
                        const endX = startX + swoopWidth;
                        newPathD += `Q ${midX},${droopDepth + 5} ${endX},5 `;
                        newBulbPositions.push({ x: midX, y: droopDepth + 2 });
                        newBulbPositions.push({ x: startX + swoopWidth * 0.25, y: droopDepth * 0.5 + 3 });
                        newBulbPositions.push({ x: startX + swoopWidth * 0.75, y: droopDepth * 0.5 + 3 });
                    }
                    
                    const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    newSvg.setAttribute('viewBox', `0 0 ${newWidth} 80`);
                    newSvg.setAttribute('preserveAspectRatio', 'none');
                    
                    const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    newPath.setAttribute('d', newPathD);
                    newPath.setAttribute('class', 'wire-path');
                    newSvg.appendChild(newPath);
                    newLightsContainer.appendChild(newSvg);
                    
                    newBulbPositions.forEach((pos, i) => {
                        if (pos.x > newWidth + 20) return;
                        const bulb = document.createElement('div');
                        bulb.className = 'xmas-bulb ' + colors[i % colors.length];
                        bulb.style.left = (pos.x - 6) + 'px';
                        bulb.style.top = (pos.y) + 'px';
                        bulb.style.animationDelay = (i * 0.15) + 's';
                        const glowAnim = ['glow1', 'glow2', 'glow3'][i % 3];
                        const glowDuration = (1.5 + (i % 3) * 0.5) + 's';
                        bulb.style.animation = `bulbSwing 3s ease-in-out infinite, ${glowAnim} ${glowDuration} ease-in-out infinite`;
                        bulb.style.animationDelay = `${(i * 0.15)}s, ${(i * 0.2)}s`;
                        newLightsContainer.appendChild(bulb);
                    });
                    
                    document.body.appendChild(newLightsContainer);
                    
                    // Sync lights visibility with header state after recreating
                    const header = document.querySelector('header') || document.querySelector('.header');
                    if (header && (header.style.transform === 'translateY(-100%)' || header.classList.contains('header-hidden'))) {
                        newLightsContainer.style.transform = 'translateY(-150px)';
                        newLightsContainer.style.opacity = '0';
                    }
                }
            }, 250);
        });
    }

    // ============================================
    // CANDY CANE LOGO DECORATION
    // ============================================
    if (CONFIG.candyCaneAccents) {
        // Add candy canes framing the logo
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.classList.add('xmas-candy-canes');
        }
        
        // Coupon button in navbar
        const couponBtn = document.createElement('button');
        couponBtn.className = 'xmas-coupon-btn';
        couponBtn.innerHTML = '<span class="gift-icon">🎁</span> Holiday Deal!';
        
        // Insert into navbar
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            const li = document.createElement('li');
            li.appendChild(couponBtn);
            navMenu.appendChild(li);
        } else {
            document.body.appendChild(couponBtn);
        }
        
        // Coupon popup
        const couponPopup = document.createElement('div');
        couponPopup.className = 'xmas-coupon-popup';
        couponPopup.innerHTML = `
            <div class="xmas-coupon-card">
                <button class="close-btn">×</button>
                <div class="gift-emoji">🎁</div>
                <h3>Holiday Special!</h3>
                <p class="discount-text">Get 15% OFF all Packages</p>
                <div class="code-box">
                    <div class="code-label">Your Coupon Code</div>
                    <div class="code-value">CHRISTMAS15</div>
                </div>
                <button class="copy-btn">Copy Code</button>
                <p class="fine-print">Valid on all website packages. Limited time offer.</p>
            </div>
        `;
        document.body.appendChild(couponPopup);
        
        // Open popup
        couponBtn.addEventListener('click', () => {
            couponPopup.classList.add('active');
        });
        
        // Close popup
        couponPopup.querySelector('.close-btn').addEventListener('click', () => {
            couponPopup.classList.remove('active');
        });
        
        // Close on backdrop click
        couponPopup.addEventListener('click', (e) => {
            if (e.target === couponPopup) {
                couponPopup.classList.remove('active');
            }
        });
        
        // Copy code functionality
        const copyBtn = couponPopup.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText('CHRISTMAS15').then(() => {
                copyBtn.textContent = 'Copied! ✓';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Code';
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });
    }

    // ============================================
    // CHRISTMAS COUNTDOWN - HOMEPAGE ONLY
    // ============================================
    // Only show countdown on homepage
    const isHomepage = window.location.pathname === '/' || 
                       window.location.pathname === '/index.html' || 
                       window.location.pathname.endsWith('/index.html') ||
                       window.location.pathname === '';
    
    if (CONFIG.countdown && isHomepage) {
        const countdown = document.createElement('div');
        countdown.id = 'xmas-countdown';
        
        function updateCountdown() {
            const now = new Date();
            const christmas = new Date(now.getFullYear(), 11, 25); // December 25
            
            // If Christmas has passed this year, count to next year
            if (now > christmas) {
                christmas.setFullYear(christmas.getFullYear() + 1);
            }
            
            const diff = christmas - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (days === 0 && hours === 0 && minutes === 0) {
                countdown.className = 'christmas-day';
                countdown.innerHTML = `
                    <div class="countdown-message">
                        <span class="countdown-tree">🎄</span>
                        Merry Christmas!
                        <span class="countdown-tree">🎄</span>
                    </div>
                `;
            } else {
                countdown.innerHTML = `
                    <div class="countdown-title">
                        <span class="countdown-title-icon">🎄</span>
                        Days Until Christmas
                        <span class="countdown-title-icon">🎄</span>
                    </div>
                    <div class="countdown-timer">
                        <div class="countdown-segment">
                            <span class="countdown-value">${String(days).padStart(2, '0')}</span>
                            <span class="countdown-label">Days</span>
                        </div>
                        <div class="countdown-segment">
                            <span class="countdown-value">${String(hours).padStart(2, '0')}</span>
                            <span class="countdown-label">Hours</span>
                        </div>
                        <div class="countdown-segment">
                            <span class="countdown-value">${String(minutes).padStart(2, '0')}</span>
                            <span class="countdown-label">Mins</span>
                        </div>
                        <div class="countdown-segment">
                            <span class="countdown-value">${String(seconds).padStart(2, '0')}</span>
                            <span class="countdown-label">Secs</span>
                        </div>
                    </div>
                `;
            }
        }
        
        updateCountdown();
        setInterval(updateCountdown, 1000); // Update every second for live countdown
        
        // Insert into hero section
        function insertCountdown() {
            const heroContent = document.querySelector('.hero-content');
            const heroActions = document.querySelector('.hero-actions');
            
            if (heroContent && heroActions) {
                // Insert after hero-actions
                heroActions.insertAdjacentElement('afterend', countdown);
            } else if (heroContent) {
                // Fallback: append to hero-content
                heroContent.appendChild(countdown);
            } else {
                // Final fallback: fixed position
                countdown.style.position = 'fixed';
                countdown.style.bottom = '20px';
                countdown.style.left = '50%';
                countdown.style.transform = 'translateX(-50%)';
                countdown.style.zIndex = '100000';
                document.body.appendChild(countdown);
            }
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', insertCountdown);
        } else {
            setTimeout(insertCountdown, 50);
        }
    }

    // ============================================
    // SPARKLE CURSOR TRAIL
    // ============================================
    if (CONFIG.festiveColors) {
        const sparkleChars = ['✨', '⭐', '❄', '✦'];
        let sparkleCount = 0;
        const maxSparkles = 3;
        
        document.addEventListener('mousemove', (e) => {
            if (Math.random() > 0.92 && sparkleCount < maxSparkles) {
                sparkleCount++;
                const sparkle = document.createElement('div');
                sparkle.className = 'xmas-sparkle';
                sparkle.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
                sparkle.style.left = (e.clientX + (Math.random() - 0.5) * 20) + 'px';
                sparkle.style.top = (e.clientY + (Math.random() - 0.5) * 20) + 'px';
                document.body.appendChild(sparkle);
                
                setTimeout(() => {
                    sparkle.remove();
                    sparkleCount--;
                }, 600);
            }
        });
        
        // Add festive class to body for link effects
        document.body.classList.add('xmas-festive-links');
    }

    // ============================================
    // GREETING TOAST
    // ============================================
    if (CONFIG.greeting && !sessionStorage.getItem('xmasGreeting8')) {
        setTimeout(() => {
            // Create backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'xmas-toast-backdrop';
            
            const toast = document.createElement('div');
            toast.className = 'xmas-toast';
            toast.innerHTML = `
                <div class="xmas-toast-icon">🎄</div>
                <div class="xmas-toast-content">
                    <h4>Happy Holidays!</h4>
                    <div class="xmas-toast-divider"></div>
                    <p>Wishing you joy & success this holiday season</p>
                </div>
                <div class="xmas-toast-ornaments">🎁 ⭐ ❄️</div>
                <button class="xmas-toast-close">×</button>
            `;
            
            const closeToast = () => {
                toast.style.animation = 'slideDown 0.3s ease forwards';
                backdrop.style.animation = 'fadeIn 0.3s ease reverse forwards';
                setTimeout(() => {
                    toast.remove();
                    backdrop.remove();
                }, 300);
            };
            
            toast.querySelector('.xmas-toast-close').onclick = closeToast;
            backdrop.onclick = closeToast;
            
            document.body.appendChild(backdrop);
            document.body.appendChild(toast);
            sessionStorage.setItem('xmasGreeting8', '1');
            
            setTimeout(() => {
                if (toast.parentElement) {
                    closeToast();
                }
            }, 8000);
        }, 1500);
    }

    // ============================================
    // HIDE LIGHTS WHEN MOBILE MENU OPENS
    // ============================================
    if (CONFIG.lights) {
        function setupMobileMenuObserver() {
            const navMenu = document.getElementById('navMenu');
            if (navMenu) {
                // Use MutationObserver to watch for class changes
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'class') {
                            const lights = document.getElementById('xmas-lights');
                            if (lights) {
                                if (navMenu.classList.contains('active')) {
                                    lights.style.opacity = '0';
                                    lights.style.pointerEvents = 'none';
                                } else {
                                    lights.style.opacity = '1';
                                    lights.style.pointerEvents = '';
                                }
                            }
                        }
                    });
                });
                observer.observe(navMenu, { attributes: true, attributeFilter: ['class'] });
            }
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupMobileMenuObserver);
        } else {
            setupMobileMenuObserver();
        }
    }

    console.log('❄ Christmas Theme loaded - Happy Holidays!');
})();
