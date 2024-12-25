import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, MessageSquare, Users, Calendar, Menu, LayoutDashboard, LogOut, Ticket ,Image as ImageIcon, X} from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const { sellerId } = useParams();
    const [isOpen, setIsOpen] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [productData, setProductData] = useState({
        name: '',
        price: '',
        img: [], // Changed from single img to images array
        category: '',
        rating: 0,
        productId: '',
        inStockValue: 0,
        soldStockValue: 0,
        description: ''
    });
    const [imageFiles, setImageFiles] = useState([]); // For storing image files
    const [imagePreviews, setImagePreviews] = useState([]); // For storing image previews
    const location = useLocation();

    // Set initial state based on screen size and update on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) { // lg breakpoint
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        };

        // Set initial state
        handleResize();

        // Add resize listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard />, path: `/admin/${sellerId}` },
        { name: 'Products', icon: <Package />, path: `/admin/products/${sellerId}` },
        { name: 'Orders', icon: <ShoppingBag />, path: `/admin/orders/${sellerId}` },
        { name: 'Complaints', icon: <MessageSquare />, path: `/admin/complaints/${sellerId}` },
        { name: 'Customers', icon: <Users />, path: `/admin/customers/${sellerId}` },
        { name: 'Calendar', icon: <Calendar />, path: `/admin/calendar/${sellerId}` },
        { name: 'Coupons', icon: <Ticket />, path: `/seller/coupons/${sellerId}` },
    ];

    const toggleSidebar = () => {
        if (window.innerWidth < 1024) { // Only allow toggle on smaller screens
            setIsOpen(!isOpen);
        }
    };

    // const handleInputChange = (e) => {
    //     const { name, value } = e.target;
    //     setProductData({...productData, [name]: value});
    // };

    const handleLogout = async () => {
        try {
            const response = await fetch(`https://sellerassignment.onrender.com/admin/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ sellerId })
            });
            
            if(response.ok) {
                navigate('/seller/login');
            }
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + imagePreviews.length > 5) {
            alert('Maximum 5 images allowed');
            return;
        }

        const newPreviews = files.map(file => ({
            url: URL.createObjectURL(file),
            file: file
        }));

        setImageFiles(prev => [...prev, ...files]);
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index) => {
        const newPreviews = [...imagePreviews];
        const newFiles = [...imageFiles];
        
        URL.revokeObjectURL(imagePreviews[index].url);
        
        newPreviews.splice(index, 1);
        newFiles.splice(index, 1);
        
        setImagePreviews(newPreviews);
        setImageFiles(newFiles);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProductData({...productData, [name]: value});
    };

    const handleSubmit = async () => {
        try {
            // Validate required fields
            if (!productData.name || !productData.price || !productData.category) {
                alert('Name, price, and category are required');
                return;
            }

            // Validate images
            if (imageFiles.length === 0) {
                alert('At least one image is required');
                return;
            }

            const formData = new FormData();
            
            // Append product data
            formData.append('name', productData.name);
            formData.append('price', productData.price);
            formData.append('category', productData.category);
            formData.append('rating', productData.rating || 0);
            formData.append('inStockValue', productData.inStockValue || 0);
            formData.append('soldStockValue', productData.soldStockValue || 0);
            formData.append('productId', productData.productId || '');
            formData.append('description', productData.description || '');

            // Append images
            imageFiles.forEach((file) => {
                formData.append('images', file);
            });

            const response = await fetch('https://sellerassignment.onrender.com/add-product', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();

            if (response.ok) {
                alert('Product added successfully!');
                setShowDialog(false);
                // Reset form
                setProductData({
                    name: '',
                    price: '',
                    category: '',
                    rating: 0,
                    inStockValue: 0,
                    soldStockValue: 0,
                    description: '',
                });
                setImageFiles([]);
                setImagePreviews([]);
            } else {
                alert(data.error || 'Error adding product');
            }
        } catch (error) {
            console.error('Error creating product:', error);
            alert('Error adding product');
        }
    };

    return (
        <>
            {/* Toggle button for small screens */}
            <button 
                onClick={toggleSidebar}
                className="fixed top-4 left-4 p-2 rounded-lg hover:bg-pink-200 lg:hidden z-50"
            >
                <Menu size={24} />
            </button>

            {showDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h2 className="text-xl font-bold mb-4">Add New Product</h2>
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Product Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={productData.name}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded mt-1"
                                required
                            />
                        </div>

                        {/* Price */}
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Price *</label>
                            <input
                                type="number"
                                name="price"
                                value={productData.price}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded mt-1"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Category *</label>
                            <input
                                type="text"
                                name="category"
                                value={productData.category}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded mt-1"
                                required
                            />
                        </div>

                        {/* Rating */}
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Rating</label>
                            <input
                                type="number"
                                name="rating"
                                value={productData.rating}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded mt-1"
                                min="0"
                                max="5"
                                step="0.1"
                            />
                        </div>

                        {/* Stock Values */}
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">In Stock</label>
                            <input
                                type="number"
                                name="inStockValue"
                                value={productData.inStockValue}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded mt-1"
                                min="0"
                            />
                        </div>

                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Sold Stock</label>
                            <input
                                type="number"
                                name="soldStockValue"
                                value={productData.soldStockValue}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded mt-1"
                                min="0"
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Product Images * (Max 5)
                                </label>
                                <div className="text-xs text-gray-500">
                                    {imagePreviews.length}/5 images
                                </div>
                            </div>
                            
                            {/* Image previews */}
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={preview.url}
                                            alt={`Preview ${index + 1}`}
                                            className="w-10 h-10 object-cover rounded"
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Upload button */}
                            {imagePreviews.length < 5 && (
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-50 h-12 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <ImageIcon className="w-4 h-4 mb-2 text-gray-500" />
                                            <p className="text-sm text-gray-500">Click to upload images</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <input
                                type="text"
                                name="description"
                                value={productData.description}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded mt-1"
                                required
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDialog(false);
                                    setImageFiles([]);
                                    setImagePreviews([]);
                                }}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 bg-pink-500 text-white rounded"
                            >
                                Save Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`fixed left-0 top-0 h-screen bg-pink-50 shadow-lg transition-all duration-300 flex flex-col 
                lg:translate-x-0 lg:w-64
                ${isOpen ? 'w-64' : 'w-20'}`}
            >
                <div className="flex items-center p-4">
                    {isOpen && (
                        <div className="text-2xl font-bold text-gray-800">
                            Mera Bestie
                        </div>
                    )}
                </div>

                <div className="flex-grow flex items-center">
                    <ul className="space-y-2 p-4 w-full">
                        {menuItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center p-2 rounded-lg transition-colors
                                        ${location.pathname === item.path 
                                            ? 'bg-pink-200 text-pink-800' 
                                            : 'text-gray-700 hover:bg-pink-100'}
                                        ${isOpen ? 'justify-start space-x-4' : 'justify-center'}`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    {isOpen && <span>{item.name}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-auto">
                    <div className={`p-4 ${isOpen ? 'block' : 'hidden'}`}>
                        <p className="text-center text-gray-600 mb-2">
                            Please, manage your products through the button below.
                        </p>
                        <button 
                            onClick={() => setShowDialog(true)}
                            className="w-full bg-pink-300 text-white py-2 rounded hover:bg-pink-400 mb-2"
                        >
                            + Add Product
                        </button>
                        
                        <Link 
                            to="/" 
                            className="w-full flex items-center justify-center bg-green-500 text-white py-2 rounded hover:bg-green-600 mb-2"
                        >
                            Go to Website
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center bg-red-500 text-white py-2 rounded hover:bg-red-600"
                        >
                            <LogOut className="mr-2" size={18} />
                            Logout
                        </button>
                    </div>

                    <footer className={`text-center text-gray-500 text-sm p-4 ${isOpen ? 'block' : 'hidden'}`}>
                        Mera Bestie Admin Dashboard © 2024
                    </footer>
                </div>
            </div>
        </>
    );
};

export default Sidebar;