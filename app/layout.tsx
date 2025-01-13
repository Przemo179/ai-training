import "./global.css";

export const metadata = {
  title: "swu",
  description: "Cards"
}

const RootLayout = ({ children }) => {
  return(
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
};

export default RootLayout;