
import './survey.css'; // Bu dosya sadece bu sayfaya özel olsun
import { GiCirclingFish } from "react-icons/gi";
// src/app/survey/layout.js
export const metadata = {
    title: 'Kullanıcı Anketi - whaleer',
    description: 'whaleer kullanıcı anketi',
  };
  
  export default function SurveyLayout({ children }) {
    return (
        <html lang="tr">
        <body>{children}</body>
      </html>
    );
  }
