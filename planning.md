# Planning

## Home Screen Structure

- ### Logo

- ### Search Bar

- ### Parks View Selection

  - #### Parks View (Select Park List Type)
  
    - By Country
    - Alphabetical

- Divider

- ### Parks List

  - #### Type: By Country

    - **Country Section**
      - Country Name
      - Parks List
        - Park Card
          - Park Name
          - Park Image (Background)
          - Tap to View

  - #### Type: Alphabetical

    - **Parks List**
      - Park Card
        - Park Name
        - Park Image (Background)
        - Tap to View

- ### Footer with Wartezeiten.APP credits

---

## Park Details Screen Structure

- ### Navbar

  - Back Button
  - Park Name
  - Refresh Button

- ### Park Image

- ### Park Opening Times

  - States
    - Open today: "Opening times"
    - Closed today: "The park is closed today"
    - Fetch error: "Opening times not available. Try again later."

- ### Note: Wait times are updated every 5 minutes

- ### Rides View Selection

  - #### Rides View (Select Ride List Type)

    - "Default" (Grouped by status, alphabetical within groups)
    - "Alphabetical" (All rides in alphabetical order, no grouping)
    - "Waiting Time (Asc)" (Grouped by status, sorted by waiting time within open rides group)
    - "Waiting Time (Desc)" (Grouped by status, sorted by waiting time within open rides group)

- Divider

- ### Rides List

  - #### Ride Card

    - Ride Name
    - Ride Status
      - Open: Show Waiting Time
        - 0-29 minutes: Show default style
        - 30-59 minutes: Show medium wait style
        - 60+ minutes: Show long wait style
      - Closed: Show closed status with icon
      - Maintenance: Show maintenance status with icon
      - Closed Ice: Show closed ice status with icon
      - Closed Weather: Show closed weather status with icon

- `Footer with Wartezeiten.APP credits`

## Brainstorming

- Home Screen
  - Search for parks or ride
  - Parks overview
    - Sort alphabetically (default) or by country
    - Filters (future feature)
      - Filter by country
        - Show parks in selected country
      - Filter by type (e.g., theme parks, water parks, etc.)
      - Filter by status (e.g., open, closed)
      - Filter by chain (e.g., Disney, Six Flags, etc.)
    - Park Cards
      - Destination name if multiple parks, park name if single park
      - Park status (open/closed)
      - Show park links and status (open/closed) if a destination has multiple parks
  - Map View (future feature)
    - Interactive map showing park locations
    - Clickable markers for each park
    - Zoom in/out functionality
    - Color-coded markers based on status

- Park Details Screen
  - Park information
    - Park name
    - Park status (open/closed)
    - Country
    - More information accordeon
      - opening times
      - purchase options
      - information
      - ticketed events
      - park website
    - View Selection (Rides, Shows, Restaurants)
      - Rides List
        - Rides Sorting
        - Rides List
          - Ride status
          - Ride name
          - Ride waiting time or status icon
      - Shows List
        - Shows List
          - Show status
          - Show name
          - Upcoming showtime
            - Expand for all times of the day
      - Restaurants List
        - Restaurant status
        - Restaurant name
        - Restaurant wait time
          - Expand for party size wait times

- Ride Details Screen
  - Ride Name
  - Ride Status
  - Current Waiting Time
  - History of Waiting Times
    - Graph showing waiting times of today
    - Graph showing waiting times of the last 7 days
    - Graph showing average waiting time of the last 7 days
    - Graph showing average waiting times of the month
      - Select date by month and year
    - Graph showing average waiting time of each month of the year
    - Graph showing average of weekdays and weekends

## Destinations and Parks

- Guangzhou Chimelong Tourist Resort
  - Chimelong Paradise
  - Chimelong Water Park
  - Chimelong Safari Park
  - Chimelong Birds Park
- Walibi Holland
- Parc Asterix
- Plopsaland De Panne
- California's Great America
- Walibi Belgium
- Silver Dollar City
- Walibi Rhône-Alpes
- Dollywood
- Phantasialand
- Holiday Park
- Futuroscope
- Chimelong International Ocean Tourist Resort
  - Chimelong Spaceship
  - Chimelong Ocean Kingdom
- Hansa-Park
- LEGOLAND Billund
- Movie Park Germany
- Disneyland Paris
  - Walt Disney Studios Park
  - Disneyland Park
- Walt Disney World® Resort
  - Magic Kingdom Park
  - EPCOT
  - Disney's Hollywood Studios
  - Disney's Animal Kingdom Theme Park
  - Disney's Typhoon Lagoon Water Park
  - Disney's Blizzard Beach Water Park
- Everland Resort
  - Caribbean Bay
  - Everland
- Efteling
- Universal Orlando Resort
  - Universal's Volcano Bay
  - Universal Islands of Adventure
  - Universal Studios Florida
  - Universals Epic Universe
- LEGOLAND Deutschland
- Hersheypark
- Europa-Park
  - Rulantica
  - Europa-Park
- Universal Studios
- Six Flags Over Texas
- Heide Park
- Liseberg
- The Great Escape
- Kennywood
- Tokyo Disney Resort
  - Tokyo DisneySea
  - Tokyo Disneyland
- Worlds of Fun
- Cedar Point
- Attractiepark Toverland
- Six Flags Great America
- Six Flags America
- Six Flags Frontier City
- Six Flags Over Georgia
- Kings Dominion
- SeaWorld San Diego
- SeaWorld San Antonio
- SeaWorld Parks and Resorts Orlando
  - SeaWorld Orlando
  - Aquatica Orlando
- Dorney Park
- Valleyfair
- PortAventura World
  - PortAventura Park
  - Ferrari Land
  - Caribe Aquatic Park
- Six Flags St. Louis
- Six Flags New England
- Six Flags México
- La Ronde, Montreal
- Six Flags Great Adventure
- Six Flags Magic Mountain
- Six Flags Fiesta Texas
- Six Flags Discovery Kingdom
- Six Flags Darien Lake
- Lotte World
- Busch Gardens Williamsburg
- Busch Gardens Tampa
- Michigan's Adventure
- Bellewaerde
- LEGOLAND California
- Canada's Wonderland
- Kings Island
- Knott's Berry Farm
- Carowinds
- Shanghai Disneyland
- Universal Studios Beijing
- Disneyland Resort
  - Disneyland Park
  - Disney California Adventure Park
- Bobbejaanland
- Hong Kong Disneyland Park
- Gardaland
- LEGOLAND Florida
- Thorpe Park
- LEGOLAND Windsor
- Alton Towers
- Chessington World of Adventures
- Mirabilandia
- Paultons Park
- Parque de Atracciones de Madrid
- Parque Warner Madrid

## Chains

### Cedar Fair Entertainment Company

- California's Great America
- Canada's Wonderland
- Carowinds
- Cedar Point
- Dorney Park
- Kings Dominion
- Kings Island
- Knott's Berry Farm
- Michigan's Adventure
- Valleyfair
- Worlds of Fun

### Chimelong Group

- Guangzhou Chimelong Tourist Resort
  - Chimelong Paradise
  - Chimelong Water Park
  - Chimelong Safari Park
  - Chimelong Birds Park
- Chimelong International Ocean Tourist Resort
  - Chimelong Spaceship
  - Chimelong Ocean Kingdom

### Compagnie des Alpes

- Parc Asterix
- Walibi Belgium
- Walibi Holland
- Walibi Rhône-Alpes
- Bellewaerde
- Futuroscope

### Disney Parks, Experiences and Products

- Disneyland Paris
  - Walt Disney Studios Park
  - Disneyland Park
- Disneyland Resort
  - Disneyland Park
  - Disney California Adventure Park
- Hong Kong Disneyland Park
- Shanghai Disneyland
- Tokyo Disney Resort
  - Tokyo DisneySea
  - Tokyo Disneyland
- Walt Disney World® Resort
  - Magic Kingdom Park
  - EPCOT
  - Disney's Hollywood Studios
  - Disney's Animal Kingdom Theme Park
  - Disney's Typhoon Lagoon Water Park
  - Disney's Blizzard Beach Water Park

### Herschend Family Entertainment

- Dollywood
- Silver Dollar City

### Hershey Entertainment and Resorts Company

- Hersheypark

### Merlin Entertainments

- Alton Towers
- Chessington World of Adventures
- Gardaland
- Heide Park
- LEGOLAND Billund
- LEGOLAND California
- LEGOLAND Deutschland
- LEGOLAND Florida
- LEGOLAND Windsor
- Thorpe Park

### Parques Reunidos

- Bobbejaanland
- Kennywood
- Mirabilandia
- Movie Park Germany
- Parque de Atracciones de Madrid
- Parque Warner Madrid

### Plopsa Group

- Holiday Park
- Plopsaland De Panne

### SeaWorld Parks & Entertainment

- Busch Gardens Tampa
- Busch Gardens Williamsburg
- SeaWorld Orlando (within SeaWorld Parks and Resorts Orlando)
- Aquatica Orlando (within SeaWorld Parks and Resorts Orlando)
- SeaWorld San Antonio
- SeaWorld San Diego

### Six Flags Entertainment Corporation

- La Ronde, Montreal
- Six Flags America
- Six Flags Darien Lake
- Six Flags Discovery Kingdom
- Six Flags Fiesta Texas
- Six Flags Frontier City
- Six Flags Great Adventure
- Six Flags Great America
- Six Flags Magic Mountain
- Six Flags México
- Six Flags New England
- Six Flags Over Georgia
- Six Flags Over Texas
- Six Flags St. Louis
- The Great Escape

### Universal Destinations & Experiences

- Universal Orlando Resort
  - Universal's Volcano Bay
  - Universal Islands of Adventure
  - Universal Studios Florida
  - Universals Epic Universe
- Universal Studios Beijing
- Universal Studios (Hollywood) (Note: The API lists this generically. This often refers to Universal Studios Hollywood, but the API data would need to be more specific for precise mapping)

### Independent / Other Ownership

- Attractiepark Toverland
- Efteling
- Europa-Park
  - Rulantica
  - Europa-Park
- Everland Resort (Samsung C&T Corporation)
- Caribbean Bay
- Everland
- Hansa-Park
- Liseberg (City of Gothenburg)
- Lotte World (Lotte Group)
- Paultons Park
- Phantasialand
- PortAventura World (Investindustrial and KKR)
  - PortAventura Park
  - Ferrari Land
  - Caribe Aquatic Park
