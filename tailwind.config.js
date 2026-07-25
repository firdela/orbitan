/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
        orbitan: {
          blue: 'hsl(var(--orbitan-blue))',
          'blue-light': 'hsl(var(--orbitan-blue-light))',
          slate: 'hsl(var(--orbitan-slate))',
          'slate-mid': 'hsl(var(--orbitan-slate-mid))',
          green: 'hsl(var(--orbitan-green))',
          'green-light': 'hsl(var(--orbitan-green-light))',
          amber: 'hsl(var(--orbitan-amber))',
          'amber-light': 'hsl(var(--orbitan-amber-light))',
          red: 'hsl(var(--orbitan-red))',
          'red-light': 'hsl(var(--orbitan-red-light))',
          purple: 'hsl(var(--orbitan-purple))',
          'purple-light': 'hsl(var(--orbitan-purple-light))',
          'blue-700': 'hsl(var(--orbitan-blue-700))',
          'green-700': 'hsl(var(--orbitan-green-700))',
          'amber-700': 'hsl(var(--orbitan-amber-700))',
          'red-700': 'hsl(var(--orbitan-red-700))',
          'purple-700': 'hsl(var(--orbitan-purple-700))',
        },
        // Subscription plan colours
        plan: {
          starter:    '#2563EB',
          growth:     '#10B981',
          business:   '#7C3AED',
          enterprise: '#111827',
          gold:       '#D4AF37',
        },
        // Industry pack colours
        pack: {
          fnb:          '#F97316',
          retail:       '#22C55E',
          healthcare:   '#06B6D4',
          education:    '#8B5CF6',
          logistics:    '#2563EB',
          construction: '#EAB308',
          recycling:    '#16A34A',
          technology:   '#0F172A',
        },
        // Marketing dark surfaces — public-facing pages
        marketing: {
          bg: 'hsl(var(--marketing-bg))',
          surface: 'hsl(var(--marketing-surface))',
          'surface-dark': 'hsl(var(--marketing-surface-dark))',
          blue: 'hsl(var(--marketing-blue))',
          gold: 'hsl(var(--marketing-gold))',
          red: 'hsl(var(--marketing-red))',
        }
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' }
        }
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.25s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
