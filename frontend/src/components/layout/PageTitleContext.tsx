import { createContext, useContext, useState } from 'react'

const PageTitleContext = createContext<{
  title: string
  setTitle: (t: string) => void
  headerRightContent: React.ReactNode | null
  setHeaderRightContent: (r: React.ReactNode | null) => void
}>({
  title: 'FitnessFriend',
  setTitle: () => {},
  headerRightContent: null,
  setHeaderRightContent: () => {},
})

export const PageTitleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [title, setTitle] = useState('FitnessFriend')
  const [headerRightContent, setHeaderRightContent] = useState<React.ReactNode | null>(null)
  return (
    <PageTitleContext.Provider value={{ title, setTitle, headerRightContent, setHeaderRightContent }}>
      {children}
    </PageTitleContext.Provider>
  )
}

export const usePageTitle = () => useContext(PageTitleContext)
