'use client';

import ApiConnectionClient from '@/components/profile_component/(api)/apiContent';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function ClientPage() {
  return (
    <div className="min-h-screen hard-gradient text-white">
    <ToastContainer/>
    <ApiConnectionClient />
    </div>
  );
}
