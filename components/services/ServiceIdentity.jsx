
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import './ServiceIdentity.css';

const colors = [
    { name: 'Deep Space', hex: '#090705', color: '#090705' },
    { name: 'Signal Gold', hex: '#EBBD40', color: '#EBBD40' },
    { name: 'Booster Lime', hex: '#C1FF37', color: '#C1FF37' },
    { name: 'Ignition', hex: '#FF6B35', color: '#FF6B35' },
    { name: 'Lunar', hex: '#E3DED3', color: '#E3DED3' },
];

const identityServices = [
    'AI-Driven Branding Frameworks',
    'Custom Design Systems',
    'Visual Identity Solutions',
    'UI/UX Design & Interactive Assets',
];

const motionStages = [
    'Circle',
    'Outline',
    'Expand',
    'Transform',
    'Square',
    'Identity',
];

export default function ServiceIdentity() {
    const root = useRef(null);
    const [activeColor, setActiveColor] = useState(1);
    const [activeMotion, setActiveMotion] = useState(5);

    const [settings, setSettings] = useState({
        logo: true,
        motion: true,
        social: false,
    });

    const [launched, setLaunched] = useState(false);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();

            mm.add(
                '(prefers-reduced-motion: no-preference)',
                () => {
                    const intro = gsap.timeline({
                        scrollTrigger: {
                            trigger: root.current,
                            start: 'top 75%',
                            toggleActions: 'play none none reverse',
                        },
                    });

                    intro
                        .from('.identity-meta', {
                            opacity: 0,
                            y: 20,
                            duration: 0.7,
                            stagger: 0.12,
                        })
                        .from(
                            '.identity-heading',
                            {
                                opacity: 0,
                                y: 55,
                                duration: 1,
                                ease: 'power4.out',
                            },
                            '-=0.35'
                        )
                        .from(
                            '.identity-number',
                            {
                                opacity: 0,
                                scale: 0.85,
                                duration: 1.1,
                                ease: 'power3.out',
                            },
                            '-=0.8'
                        )
                        .from(
                            '.identity-intro-right',
                            {
                                opacity: 0,
                                x: 35,
                                duration: 0.9,
                                ease: 'power3.out',
                            },
                            '-=0.65'
                        )
                        .from(
                            '.identity-artifact',
                            {
                                opacity: 0,
                                y: 45,
                                rotate: 2,
                                duration: 0.9,
                                stagger: 0.13,
                                ease: 'power3.out',
                            },
                            '-=0.45'
                        )
                        .from(
                            '.identity-motion-step',
                            {
                                opacity: 0,
                                scale: 0.7,
                                y: 20,
                                stagger: 0.1,
                                duration: 0.6,
                                ease: 'back.out(1.5)',
                            },
                            '-=0.4'
                        );

                    // Continuous subtle construction rotation
                    gsap.to('.identity-logo-orbit', {
                        rotation: 360,
                        duration: 35,
                        repeat: -1,
                        ease: 'none',
                    });

                    // Floating specimen card
                    gsap.to('.identity-type-card', {
                        y: -9,
                        rotation: 0.4,
                        duration: 3.5,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                    });

                    // Floating application card
                    gsap.to('.identity-application', {
                        y: -8,
                        rotation: -0.6,
                        duration: 4,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                    });

                    // Brand kit subtle movement
                    gsap.to('.identity-kit', {
                        y: -5,
                        duration: 3,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                    });

                    return () => intro.kill();
                }
            );

            return () => mm.revert();
        },
        { scope: root }
    );

    const toggleSetting = (key) => {
        setSettings((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    return (
        <section
            ref={root}
            className="identity-section"
            id="service-identity"
        >
            <div className="identity-container">

                {/* ==================================
            TOP INTRODUCTION
        ================================== */}

                <div className="identity-top">

                    <div className="identity-left">

                        <div className="identity-meta">
                            <span>04 / 04</span>

                            <span className="identity-stage">
                                <i />
                                STAGE 04 · PAYLOAD
                            </span>
                        </div>

                        <h2 className="identity-heading">
                            Visual Identity
                            <br />
                            Systems
                        </h2>

                        <p className="identity-tagline">
                            More Than a Look.
                            <br />
                            A Language of Your Own.
                        </p>

                    </div>

                    <div className="identity-number" aria-hidden="true">
                        04
                    </div>

                    <div className="identity-intro-right">

                        <p className="identity-eyebrow">
                            THE BRANDING STUDIO
                        </p>

                        <p className="identity-description">
                            We build distinctive, scalable visual identities
                            that give brands a recognizable personality
                            across every digital and physical touchpoint,
                            combining strategic thinking with intelligent
                            design systems.
                        </p>

                        <div className="identity-service-list">

                            {identityServices.map((service, index) => (
                                <Link
                                    href="/portfolio"
                                    key={service}
                                    className="identity-service-item"
                                >
                                    <span>
                                        {String(index + 1).padStart(2, '0')}
                                    </span>

                                    <strong>{service}</strong>

                                    <i>↗</i>
                                </Link>
                            ))}

                        </div>

                        <Link
                            href="/portfolio"
                            className="identity-cta"
                        >
                            Explore Visual Identity
                            <span>↗</span>
                        </Link>

                    </div>

                </div>

                {/* ==================================
            BRAND IDENTITY WORKSPACE
        ================================== */}

                <div className="identity-workspace">

                    {/* LOGO CONSTRUCTION BOARD */}

                    <div className="identity-artifact identity-logo-board">

                        <div className="artifact-label">
                            <span>MARK / CONSTRUCTION 01</span>
                            <span>GRID 8 × 8</span>
                        </div>

                        <div className="identity-logo-grid" />

                        <div className="identity-logo-orbit">
                            <span />
                        </div>

                        <div className="identity-logo-mark">
                            <span className="logo-ring logo-ring-gold" />
                            <span className="logo-ring logo-ring-white" />
                            <span className="logo-center-diamond" />
                        </div>

                        <div className="logo-exploration">
                            <span>EXPLORATION — V1 · V2 · V3</span>

                            <div>
                                <i className="active" />
                                <i />
                                <i />
                            </div>
                        </div>

                    </div>

                    {/* TYPOGRAPHY SPECIMEN */}

                    <div className="identity-artifact identity-type-card">

                        <p className="type-label">
                            TYPE / SPECIMEN
                        </p>

                        <div className="type-card-main">

                            <span className="type-sample">
                                Aa
                            </span>

                            <div className="type-details">

                                <div>
                                    <span>Display</span>
                                    <strong>Montserrat Bold</strong>
                                </div>

                                <div>
                                    <span>Text</span>
                                    <strong>Plus Jakarta Sans</strong>
                                </div>

                            </div>

                        </div>

                        <div className="type-alphabet">
                            ABCDEFGHIJKLMNOPQRSTUVWXYZ
                            <br />
                            abcdefghijklmnopqrstuvwxyz 0123456789
                        </div>

                    </div>

                    {/* COLOUR SYSTEM */}

                    <div className="identity-artifact identity-color-board">

                        <div className="color-board-label">
                            COLOUR / SYSTEM
                        </div>

                        <div className="identity-color-grid">

                            {colors.map((item, index) => (
                                <button
                                    type="button"
                                    key={item.name}
                                    className={`identity-color ${activeColor === index ? 'is-selected' : ''
                                        }`}
                                    style={{
                                        '--swatch': item.color,
                                    }}
                                    onClick={() => setActiveColor(index)}
                                    aria-label={`Select ${item.name}, ${item.hex}`}
                                    aria-pressed={activeColor === index}
                                >
                                    <span>{item.name}</span>
                                    <small>{item.hex}</small>
                                </button>
                            ))}

                        </div>

                    </div>

                    {/* APPLICATION PREVIEW */}

                    <div className="identity-artifact identity-application">

                        <img
                            src="/images/identity-application.jpg"
                            alt="Visual identity campaign application"
                        />

                        <div className="application-footer">
                            <div className="application-mark">
                                <span />
                                <span />
                            </div>

                            <div>
                                <strong>Limited Edition</strong>
                                <small>APPLICATION / PACKAGING</small>
                            </div>

                        </div>

                    </div>

                    {/* INTERACTIVE BRAND KIT */}

                    <div className="identity-artifact identity-kit">

                        <div className="kit-greeting">
                            <span>Good evening</span>
                            <strong>Your brand kit</strong>
                        </div>

                        <div className="kit-identity-card">
                            <span>Identity v3</span>
                            <small>
                                {launched ? 'IDENTITY READY' : 'READY TO EXPORT'}
                            </small>
                        </div>

                        <div className="kit-settings">

                            {[
                                { key: 'logo', label: 'Logo set' },
                                { key: 'motion', label: 'Motion kit' },
                                { key: 'social', label: 'Social templates' },
                            ].map((item) => (
                                <div className="kit-setting" key={item.key}>
                                    <span>{item.label}</span>

                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={settings[item.key]}
                                        aria-label={item.label}
                                        className={`kit-switch ${settings[item.key] ? 'enabled' : ''
                                            }`}
                                        onClick={() => toggleSetting(item.key)}
                                    >
                                        <i />
                                    </button>
                                </div>
                            ))}

                        </div>

                        <button
                            type="button"
                            className="kit-launch"
                            onClick={() => setLaunched((value) => !value)}
                        >
                            {launched ? 'Identity Ready ✓' : 'Launch Identity'}
                        </button>

                        <span className="kit-caption">
                            UI / UX PREVIEW
                        </span>

                    </div>

                    {/* MOTION IDENTITY TIMELINE */}

                    <div className="identity-artifact identity-motion-board">

                        <div className="motion-header">
                            <span>MOTION IDENTITY / LOGO REVEAL</span>
                            <span>0.0S → 1.2S · EASE-OUT</span>
                        </div>

                        <div className="identity-motion-track">

                            {motionStages.map((stage, index) => (
                                <div
                                    className={`identity-motion-step ${activeMotion === index ? 'is-active' : ''
                                        }`}
                                    key={stage}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setActiveMotion(index)}
                                        aria-label={`Show ${stage} animation stage`}
                                        aria-pressed={activeMotion === index}
                                    >
                                        <span className={`motion-shape shape-${index + 1}`} />
                                    </button>

                                    {index !== motionStages.length - 1 && (
                                        <span className="motion-arrow">→</span>
                                    )}

                                    <span className="motion-diamond" />
                                    <small>{stage}</small>
                                </div>
                            ))}

                        </div>

                    </div>

                </div>

            </div>
        </section>
    );
}
