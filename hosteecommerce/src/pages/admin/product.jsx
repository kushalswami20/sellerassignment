import React, { useState, useEffect } from "react";
import Sidebar from "../../components/admin/sidebar";
import { Pencil, Save, Search, ArrowUpDown ,Trash2 } from "lucide-react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate } from "react-router-dom";

const Product = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    name: "",
    category: "",
    price: "",
    inStockValue: "",
    soldStockValue: "",
    description: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  useEffect(() => {
    const verifySeller = async () => {
      if (!sellerId) {
        navigate("/seller/login");
        return;
      }

      try {
        const response = await fetch(
          `${process.env.BACKEND_URL}/admin/verify-seller`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sellerId }),
          }
        );

        const data = await response.json();

        if (data.loggedIn !== "loggedin") {
          navigate("/seller/login");
        }
      } catch (error) {
        console.error("Error verifying seller:", error);
        navigate("/seller/login");
      }
    };

    verifySeller();
  }, [sellerId, navigate]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/get-product`);
      const data = await response.json();
      setProducts(data.products); // Access the products array from response
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.productId);
    setEditValues({
      name: product.name || "",
      category: product.category || "",
      price: product.price || 0,
      inStockValue: product.inStockValue || 0,
      soldStockValue: product.soldStockValue || 0,
      description: product.description || "",
    });
  };

  const handleSave = async (productId) => {
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/instock-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          name: editValues.name || "",
          category: editValues.category || "",
          price: editValues.price || 0,
          inStockValue: editValues.inStockValue || 0,
          soldStockValue: editValues.soldStockValue || 0,
          description: editValues.description || "",
        }),
      });

      if (response.ok) {
        setEditingId(null);
        fetchProducts();
      }
    } catch (error) {
      console.error("Error updating stock values:", error);
    }
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = React.useMemo(() => {
    if (!Array.isArray(products)) return [];

    let sortableProducts = [...products];
    if (sortConfig.key !== null) {
      sortableProducts.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableProducts;
  }, [products, sortConfig]);

  const filteredProducts = sortedProducts.filter(
    (product) =>
      product.productId
        ?.toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      product.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const [error, setError] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      console.log("Deleting product:", productToDelete.productId); // Debug log
      const response = await fetch(
        `${process.env.BACKEND_URL}/delete-product/${productToDelete.productId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setProducts(
          products.filter((p) => p.productId !== productToDelete.productId)
        );
        setShowConfirmDialog(false);
        setProductToDelete(null);
      } else {
        setError(data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      setError("Something went wrong while deleting the product");
    }
  };

  return (
    <div className="flex">
      <Helmet>
        <title>Products | Admin | Mera Bestie</title>
      </Helmet>
      <Sidebar />
      <div className="flex-1 p-8 ml-[5rem] lg:ml-64 bg-pink-50 min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <div className="relative">
            <div
              className={`flex items-center ${
                isSearchExpanded ? "w-full md:w-64" : "w-10 md:w-64"
              } transition-all duration-300`}
            >
              <button
                className="md:hidden absolute left-2 z-10"
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              >
                <Search size={20} />
              </button>
              <input
                type="text"
                placeholder="Search by product ID or name..."
                className={`pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                  isSearchExpanded
                    ? "w-full opacity-100"
                    : "w-0 md:w-full opacity-0 md:opacity-100"
                } transition-all duration-300`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-pink-100">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                >
                  <div className="flex items-center">
                    Product
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("category")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                >
                  <div className="flex items-center">
                    Category
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("price")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                >
                  <div className="flex items-center">
                    Price
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("inStockValue")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                >
                  <div className="flex items-center">
                    In Stock
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("soldStockValue")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                >
                  <div className="flex items-center">
                    Sold
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.productId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === product.productId ? (
                      <input
                        type="text"
                        className="w-20 border rounded px-2 py-1"
                        value={editValues.name}
                        onChange={(e) =>
                          setEditValues({ ...editValues, name: e.target.value })
                        }
                      />
                    ) : (
                      product.name || "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === product.productId ? (
                      <input
                        type="text"
                        className="w-20 border rounded px-2 py-1"
                        value={editValues.category}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            category: e.target.value,
                          })
                        }
                      />
                    ) : (
                      product.category || "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === product.productId ? (
                      <input
                        type="number"
                        className="w-20 border rounded px-2 py-1"
                        value={editValues.price}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            price: e.target.value,
                          })
                        }
                      />
                    ) : (
                      product.price || "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === product.productId ? (
                      <input
                        type="number"
                        className="w-20 border rounded px-2 py-1"
                        value={editValues.inStockValue}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            inStockValue: e.target.value,
                          })
                        }
                      />
                    ) : (
                      product.inStockValue || "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === product.productId ? (
                      <input
                        type="number"
                        className="w-20 border rounded px-2 py-1"
                        value={editValues.soldStockValue}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            soldStockValue: e.target.value,
                          })
                        }
                      />
                    ) : (
                      product.soldStockValue || "-"
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === product.productId ? (
                      <button
                        onClick={() => handleSave(product.productId)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Save size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(product)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                    {showConfirmDialog && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white p-6 rounded shadow-lg">
                          <h2 className="text-lg font-bold mb-4">
                            Confirm Delete
                          </h2>
                          <p>Are you sure you want to delete this product?</p>
                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              onClick={() => setShowConfirmDialog(false)}
                              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteConfirm}
                              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Product;
