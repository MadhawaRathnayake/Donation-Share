import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, HandHeart, Users, Truck, Shield } from 'lucide-react';

const Sidebar = () => {
  const { roles } = useAuth();

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 text-2xl font-bold border-b border-gray-800">
        FoodShare
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/" className={({isActive}) => `flex items-center gap-3 p-3 rounded-md hover:bg-gray-800 ${isActive ? 'bg-gray-800 text-blue-400' : ''}`}>
          <Home size={20} /> Home
        </NavLink>
        
        {roles.includes('Donor') && (
          <NavLink to="/donor" className={({isActive}) => `flex items-center gap-3 p-3 rounded-md hover:bg-gray-800 ${isActive ? 'bg-gray-800 text-blue-400' : ''}`}>
            <HandHeart size={20} /> Post Donations
          </NavLink>
        )}
        
        {roles.includes('Recipient') && (
          <NavLink to="/recipient" className={({isActive}) => `flex items-center gap-3 p-3 rounded-md hover:bg-gray-800 ${isActive ? 'bg-gray-800 text-blue-400' : ''}`}>
            <Users size={20} /> Claim Food
          </NavLink>
        )}

        {roles.includes('Volunteer') && (
          <NavLink to="/volunteer" className={({isActive}) => `flex items-center gap-3 p-3 rounded-md hover:bg-gray-800 ${isActive ? 'bg-gray-800 text-blue-400' : ''}`}>
            <Truck size={20} /> Deliveries
          </NavLink>
        )}

        {roles.includes('Admin') && (
          <NavLink to="/admin" className={({isActive}) => `flex items-center gap-3 p-3 rounded-md hover:bg-gray-800 ${isActive ? 'bg-gray-800 text-blue-400' : ''}`}>
            <Shield size={20} /> Admin Panel
          </NavLink>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
