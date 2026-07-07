import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarIcon, 
  SparklesIcon,
  ArrowRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: SparklesIcon,
      title: 'Personalized Experience',
      description: 'Find events that match your interests, location, and budget preferences. Create your perfect event calendar.',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: EyeIcon,
      title: 'Easy Discovery',
      description: 'Browse events by category, location, and date. Find the perfect events that match your interests and schedule.',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: CalendarIcon,
      title: 'Seamless Event Creation',
      description: 'Easily create and manage your own events. Customize details, invite participants, and track engagement—all in one place.',
      color: 'bg-yellow-100 text-yellow-600'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden transition-colors duration-300
        bg-gradient-to-br from-blue-100 via-white to-purple-100 dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900">
        <div className="hidden dark:block absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="hidden dark:block absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tr from-purple-900 via-blue-900 to-gray-900 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="block dark:hidden absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-200 via-purple-100 to-white opacity-30 rounded-full blur-2xl pointer-events-none"></div>
        <div className="block dark:hidden absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tr from-purple-100 via-blue-100 to-white opacity-20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight text-gray-900 dark:text-white drop-shadow">
            Welcome to <span className="text-blue-600 dark:text-blue-400">PlanPal</span>
          </h1>
          <p className="text-lg md:text-2xl mb-10 max-w-2xl mx-auto text-gray-700 dark:text-gray-300 leading-relaxed">
            Discover, join, and create amazing events. Meet new friends, explore your interests, and make every moment memorable with a vibrant community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="px-10 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-full hover:from-blue-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-lg"
                >
                  Get Started
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="px-10 py-4 border-2 border-blue-500 text-blue-700 dark:text-blue-400 font-semibold rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-800 dark:hover:text-white transition-all text-lg"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="px-10 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-full hover:from-blue-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg text-lg"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/create-event"
                  className="px-10 py-4 border-2 border-blue-500 text-blue-700 dark:text-blue-400 font-semibold rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-800 dark:hover:text-white transition-all text-lg"
                >
                  Create Event
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-indigo-950 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6 drop-shadow">
              Why Choose PlanPal?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Our intelligent matching system connects you with events and people that truly align with your preferences.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-white/90 dark:bg-gray-900/80 rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 hover:scale-105 border border-gray-200 dark:border-gray-800 backdrop-blur-md"
                style={{ transition: 'box-shadow 0.3s, transform 0.3s' }}
              >
                <div className={`h-16 w-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
