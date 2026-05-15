import { createContext, useContext, useState } from 'react'

const PageTitleContext = createContext<{
  title: string
  setTitle: (t: string) => void
  headerRightContent: React.ReactNode | null
  setHeaderRightContent: (r: React.ReactNode | null) => void
  centerContent: React.ReactNode | null
  setCenterContent: (r: React.ReactNode | null) => void
}>({
  title: 'FitnessFriend',
  setTitle: () => {},
  headerRightContent: null,
  setHeaderRightContent: () => {},
  centerContent: null,
  setCenterContent: () => {},
})

export const PageTitleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [title, setTitle] = useState('FitnessFriend')
  const [headerRightContent, setHeaderRightContent] = useState<React.ReactNode | null>(null)
  const [centerContent, setCenterContent] = useState<React.ReactNode | null>(null)
  return (
    <PageTitleContext.Provider value={{ title, setTitle, headerRightContent, setHeaderRightContent, centerContent, setCenterContent }}>
      {children}
    </PageTitleContext.Provider>
  )
}

export const usePageTitle = () => useContext(PageTitleContext)
