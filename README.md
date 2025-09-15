# HangoutGPT

A location-aware chatbot that helps you discover hangout spots and venues on an interactive map. Simply ask for recommendations and watch as places appear on the map in real-time.

![HangoutGPT Interface](https://via.placeholder.com/800x400?text=HangoutGPT+Interface)

## Features

- 🗺️ **Interactive Map**: Powered by MapLibre GL with detailed street maps
- 🤖 **AI Assistant**: GPT-powered chat that understands location queries
- 📍 **Smart Search**: Finds venues using OpenStreetMap's Nominatim API
- 🎯 **Regional Awareness**: Understands Singapore regions (East, West, North, South)
- 🔍 **Multiple Venue Types**: Restaurants, cafes, parks, malls, and more

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd HangoutGPT
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_api_key_here
NOMINATIM_USER_AGENT=hangoutgpt/1.0
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Example Queries

Try asking the AI assistant:

- **General**: "Show me 5 hangout spots in Singapore"
- **Regional**: "Find cafes in the east"
- **Specific**: "Where can I go for a date night in Orchard?"
- **Activity-based**: "Show me outdoor places for weekend activities"
- **Cuisine**: "Find good ramen restaurants in the west"

### How it Works

1. **Chat Interface**: Type your location query in the chat
2. **AI Processing**: GPT analyzes your request and calls the places search tool
3. **Map Search**: The system queries Nominatim API for relevant venues
4. **Real-time Display**: Found places are plotted on the map with labels


## Project Structure

```
├── app/
│   ├── components/
│   │   ├── Chat.tsx          # Main chat interface
│   │   ├── Map.tsx           # Interactive map component
│   │   └── ai-elements/      # Reusable chat UI components
│   ├── api/chat/
│   │   └── route.ts          # AI chat API endpoint
│   ├── layout.tsx            # Root layout with fonts
│   └── page.tsx              # Main page layout
├── lib/
│   ├── events.ts             # Event system for chat-map communication
│   ├── helpers.ts            # Utility functions
│   └── locate.ts             # Location search and ranking logic
└── public/                   # Static assets
```

## API Keys Setup

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and navigate to API Keys
3. Generate a new API key
4. Add it to your `.env.local` as `OPENAI_API_KEY`

### MapTiler API Key
1. Sign up at [MapTiler](https://www.maptiler.com/)
2. Go to your account dashboard
3. Copy your API key
4. Add it to your `.env.local` as `NEXT_PUBLIC_MAPTILER_API_KEY`

## Technologies Used

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-5-mini, AI SDK v5
- **Maps**: MapLibre GL, MapTiler
- **Location Data**: OpenStreetMap Nominatim API
- **UI Components**: Custom chat interface with Lucide icons

## Features in Detail

### Smart Location Detection
- Understands directional queries (east, west, north, south)
- Automatically focuses map viewport on requested regions
- Handles both specific places and general areas

### Venue Type Recognition
- Converts activity descriptions to venue types
- Example: "date night" → restaurants, bars, waterfronts
- Supports cuisine-specific searches

### Map Integration
- Interactive controls (zoom, pan, navigation)
- Point markers with labels
- Automatic map bounds fitting
- Polygon support for larger venues


## Acknowledgments

- OpenStreetMap contributors for location data
- MapTiler for map tiles and styling
- OpenAI for GPT capabilities
- Nominatim for geocoding services

---

**Note**: This application is optimized for Singapore locations but can be extended to other regions by modifying the viewbox and search parameters in the configuration.