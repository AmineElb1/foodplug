# Food Plug

React + Vite + react-three-fiber. De 3D burger staat in `public/burger_2.glb`.

    npm install
    npm run dev

- `src/components/Burger.jsx`: laadt het model (rotatie, schaal)
- `src/components/BurgerScene.jsx`: camera (past zich aan de schermbreedte aan), licht, schaduw; rotatie volgt de scrollpositie
- `src/data.js`: menu-items (voorbeeldprijzen, vervang ze)
