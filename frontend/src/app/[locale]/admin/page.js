'use client';

import { useEffect, useState } from 'react';
import api from '@/api/axios';
import FreeFallDiv from '@/components/FreeFallDiv';

// axios.defaults.withCredentials = true;

export default function Page() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await api.get("/fetch/user/last_login");
        setUsers(response.data);
      } catch (error) {
        console.error('Kullanıcılar alınamadı:', error);
      }
    }

    fetchUsers();
  }, []);

  return (
    <div className="w-screen h-screen overflow-auto bg-gray-900 text-white p-8">
      <h1 className="text-3xl mb-6">Admin Sayfası</h1>
      <table className="w-full table-auto border-collapse border border-gray-600">
        <thead>
          <tr>
            <th className="border border-gray-600 px-4 py-2">ID</th>
            <th className="border border-gray-600 px-4 py-2">Kullanıcı Adı</th>
            <th className="border border-gray-600 px-4 py-2">Son Giriş</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-800">
              <td className="border border-gray-600 px-4 py-2">{user.id}</td>
              <td className="border border-gray-600 px-4 py-2">{user.username}</td>
              <td className="border border-gray-600 px-4 py-2">
                {user.last_login ? new Date(user.last_login).toLocaleString() : 'Yok'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <FreeFallDiv />
    </div>
  );
}
