import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

import { AuthProvider, useAuth } from '../hooks/useAuth'

export { AuthProvider }
export type { User, Session }

